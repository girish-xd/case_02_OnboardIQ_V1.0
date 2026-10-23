import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { getRulesConfig, loadRulesConfig } from '../config/rulesConfig.js';
import { evaluateApplicationRules, ScreeningContext } from '../services/rulesEngine.js';
import { DeclaredDocType } from '../types/index.js';

function resolveFilePath(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), filename),
    path.resolve(process.cwd(), '..', filename),
    path.resolve(process.cwd(), 'docs', 'source', filename),
    path.resolve(process.cwd(), '..', 'docs', 'source', filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), filename);
}

export function runBatchEvaluation(
  applicationsFile: string,
  documentsFile: string,
  extractionFile: string,
  outputFile: string
) {
  console.log(`[Batch] Running batch evaluation:`);
  console.log(`  Apps:        ${applicationsFile}`);
  console.log(`  Docs:        ${documentsFile}`);
  console.log(`  Extractions: ${extractionFile}`);
  console.log(`  Output:      ${outputFile}`);

  loadRulesConfig();
  const config = getRulesConfig();

  // Load Occupations
  const occMap: Record<string, string> = {};
  const occPath = resolveFilePath('case_02_occupations_V1.0.csv');
  if (fs.existsSync(occPath)) {
    const occs: Array<any> = parse(fs.readFileSync(occPath, 'utf-8'), { columns: true, skip_empty_lines: true });
    for (const o of occs) occMap[o.occupation_code] = o.risk_level;
  }

  // Load Existing Customers
  const existingPans = new Set<string>();
  const custPath = resolveFilePath('case_02_existing_customers_V1.0.csv');
  if (fs.existsSync(custPath)) {
    const custs: Array<any> = parse(fs.readFileSync(custPath, 'utf-8'), { columns: true, skip_empty_lines: true });
    for (const c of custs) existingPans.add(c.pan_number);
  }

  // Load Sanctions
  const sanctions: Array<any> = [];
  const sancPath = resolveFilePath('case_02_sanctions_list_V1.0.csv');
  if (fs.existsSync(sancPath)) {
    const list: Array<any> = parse(fs.readFileSync(sancPath, 'utf-8'), { columns: true, skip_empty_lines: true });
    for (const s of list) sanctions.push({ id: s.list_id, name: s.name, alias: s.alias, dob: s.dob });
  }

  // Load PEPs
  const peps: Array<any> = [];
  const pepPath = resolveFilePath('case_02_pep_list_V1.0.csv');
  if (fs.existsSync(pepPath)) {
    const list: Array<any> = parse(fs.readFileSync(pepPath, 'utf-8'), { columns: true, skip_empty_lines: true });
    for (const p of list) peps.push({ id: p.pep_id, name: p.name, dob: p.dob });
  }

  const screeningContext: ScreeningContext = {
    sanctions,
    peps,
    existingCustomerPans: existingPans,
    occupationRiskLevels: occMap,
  };

  // Load documents by application_id
  const docsByApp: Map<string, Array<{ docId: string; fileName: string; declaredDocType: DeclaredDocType }>> = new Map();
  if (fs.existsSync(documentsFile)) {
    const docs: Array<any> = parse(fs.readFileSync(documentsFile, 'utf-8'), { columns: true, skip_empty_lines: true });
    for (const d of docs) {
      if (!docsByApp.has(d.application_id)) docsByApp.set(d.application_id, []);
      docsByApp.get(d.application_id)!.push({
        docId: d.doc_id,
        fileName: d.file_name,
        declaredDocType: d.declared_doc_type as DeclaredDocType,
      });
    }
  }

  // Load extractions by doc_id
  const extractionsByDoc: Map<string, { docType: DeclaredDocType; docTypeConf: number; fields: Record<string, { value: string; confidence: number }> }> = new Map();
  if (fs.existsSync(extractionFile)) {
    const extractions: Array<any> = parse(fs.readFileSync(extractionFile, 'utf-8'), { columns: true, skip_empty_lines: true });
    for (const e of extractions) {
      const docId = e.doc_id;
      if (!extractionsByDoc.has(docId)) {
        extractionsByDoc.set(docId, {
          docType: 'OTHER',
          docTypeConf: 0.0,
          fields: {},
        });
      }
      const entry = extractionsByDoc.get(docId)!;
      const fName = e.field_name;
      const val = e.value || '';
      const conf = parseFloat(e.confidence) || 0.0;

      if (fName === 'doc_type') {
        entry.docType = val as DeclaredDocType;
        entry.docTypeConf = conf;
      } else {
        entry.fields[fName] = { value: val, confidence: conf };
      }
    }
  }

  // Read applications and evaluate
  const apps: Array<any> = parse(fs.readFileSync(applicationsFile, 'utf-8'), { columns: true, skip_empty_lines: true });
  const outRows: Array<{
    application_id: string;
    decision: string;
    reason_codes: string;
    name_match_score: string;
    risk_category: string;
    rekyc_due_date: string;
  }> = [];

  for (const app of apps) {
    const appId = app.application_id;
    const appDocs = docsByApp.get(appId) || [];
    const documentInputs = appDocs.map((d) => {
      const ext = extractionsByDoc.get(d.docId) || { docType: 'OTHER', docTypeConf: 0.0, fields: {} };
      return {
        docId: d.docId,
        declaredDocType: d.declaredDocType,
        classifiedDocType: ext.docType,
        docTypeConfidence: ext.docTypeConf,
        fields: ext.fields,
      };
    });

    const evalResult = evaluateApplicationRules(
      {
        applicationId: appId,
        applicationDate: app.application_date,
        fullName: app.full_name,
        dob: app.dob,
        panNumber: app.pan_number,
        aadhaarLast4: app.aadhaar_last4,
        pincode: app.pincode,
        occupationCode: app.occupation_code,
        annualIncome: parseFloat(app.annual_income) || 0,
      },
      documentInputs,
      screeningContext,
      config
    );

    const nmsStr = evalResult.nameMatchScore !== null ? evalResult.nameMatchScore.toFixed(4) : '';

    outRows.push({
      application_id: appId,
      decision: evalResult.decision,
      reason_codes: evalResult.reasonCodes.join('|'),
      name_match_score: nmsStr,
      risk_category: evalResult.riskCategory,
      rekyc_due_date: evalResult.rekycDueDate,
    });
  }

  // Write CSV output
  const outDir = path.dirname(outputFile);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const csvHeader = 'application_id,decision,reason_codes,name_match_score,risk_category,rekyc_due_date\n';
  const csvBody = outRows
    .map(
      (r) =>
        `${r.application_id},${r.decision},${r.reason_codes},${r.name_match_score},${r.risk_category},${r.rekyc_due_date}`
    )
    .join('\n');

  fs.writeFileSync(outputFile, csvHeader + csvBody, 'utf-8');
  console.log(`[Batch] Successfully wrote ${outRows.length} rows to ${outputFile}`);
  return outRows;
}

// CLI Execution
if (process.argv[1]?.includes('batch_eval')) {
  const appsFile = resolveFilePath('case_02_applications_eval_V1.0.csv');
  const docsFile = resolveFilePath('case_02_documents_eval_V1.0.csv');
  const extFile = resolveFilePath('case_02_extraction_mock_eval_V1.0.csv');
  const outFile = path.resolve(process.cwd(), '..', 'output', 'decisions_output.csv');

  runBatchEvaluation(appsFile, docsFile, extFile, outFile);
}
