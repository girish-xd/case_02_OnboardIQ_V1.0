import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { DocumentModel } from '../models/Document.js';
import { Extraction } from '../models/Extraction.js';
import { SanctionsList, PepList, ExistingCustomer, Occupation } from '../models/Watchlists.js';
import { documentStorage } from '../services/storageAdapter.js';
import { stateMachine } from '../services/stateMachine.js';
import { DeclaredDocType } from '../types/index.js';

export async function runSeed(isTest = false) {
  console.log('[Seed] Starting database seed...');

  // 1. Seed Demo Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const demoUsers = [
    {
      username: 'applicant1',
      email: 'applicant1@example.com',
      passwordHash,
      role: 'APPLICANT',
      fullName: 'Ravi Kumar Sharma',
      applicantId: 'applicant1',
    },
    {
      username: 'maker1',
      email: 'maker1@deccandigital.com',
      passwordHash,
      role: 'MAKER',
      fullName: 'Arun Patel (KYC Officer)',
    },
    {
      username: 'maker2',
      email: 'maker2@deccandigital.com',
      passwordHash,
      role: 'MAKER',
      fullName: 'Pooja Reddy (KYC Officer)',
    },
    {
      username: 'checker1',
      email: 'checker1@deccandigital.com',
      passwordHash,
      role: 'CHECKER',
      fullName: 'Vikram Malhotra (Compliance Officer)',
    },
    {
      username: 'admin1',
      email: 'admin1@deccandigital.com',
      passwordHash,
      role: 'ADMIN',
      fullName: 'Ananya Deshmukh (Admin)',
    },
  ];

  for (const u of demoUsers) {
    await User.findOneAndUpdate({ username: u.username }, { $set: u }, { upsert: true });
  }
  console.log(`[Seed] Seeded ${demoUsers.length} demo users.`);

  // 2. Seed Reference & Watchlists
  const resolveFilePath = (filename: string): string => {
    const candidates = [
      path.resolve(process.cwd(), filename),
      path.resolve(process.cwd(), '..', filename),
      path.resolve(process.cwd(), 'docs', 'source', filename),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return '';
  };

  // Occupations
  const occPath = resolveFilePath('case_02_occupations_V1.0.csv');
  if (occPath) {
    const occs: Array<{ occupation_code: string; description: string; risk_level: string }> = parse(
      fs.readFileSync(occPath, 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    for (const row of occs) {
      await Occupation.findOneAndUpdate(
        { occupationCode: row.occupation_code },
        {
          occupationCode: row.occupation_code,
          description: row.description,
          riskLevel: row.risk_level as any,
        },
        { upsert: true }
      );
    }
    console.log(`[Seed] Seeded ${occs.length} occupations.`);
  }

  // Sanctions
  const sanctionsPath = resolveFilePath('case_02_sanctions_list_V1.0.csv');
  if (sanctionsPath) {
    const sanctions: Array<any> = parse(fs.readFileSync(sanctionsPath, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const row of sanctions) {
      await SanctionsList.findOneAndUpdate(
        { listId: row.list_id },
        {
          listId: row.list_id,
          name: row.name,
          alias: row.alias,
          dob: row.dob,
          nationality: row.nationality,
          program: row.program,
        },
        { upsert: true }
      );
    }
    console.log(`[Seed] Seeded ${sanctions.length} sanctions entries.`);
  }

  // PEPs
  const pepPath = resolveFilePath('case_02_pep_list_V1.0.csv');
  if (pepPath) {
    const peps: Array<any> = parse(fs.readFileSync(pepPath, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const row of peps) {
      await PepList.findOneAndUpdate(
        { pepId: row.pep_id },
        {
          pepId: row.pep_id,
          name: row.name,
          dob: row.dob,
          position: row.position,
          category: row.category,
        },
        { upsert: true }
      );
    }
    console.log(`[Seed] Seeded ${peps.length} PEP entries.`);
  }

  // Existing Customers
  const custPath = resolveFilePath('case_02_existing_customers_V1.0.csv');
  if (custPath) {
    const custs: Array<any> = parse(fs.readFileSync(custPath, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const row of custs) {
      await ExistingCustomer.findOneAndUpdate(
        { customerId: row.customer_id },
        {
          customerId: row.customer_id,
          fullName: row.full_name,
          panNumber: row.pan_number,
          dob: row.dob,
        },
        { upsert: true }
      );
    }
    console.log(`[Seed] Seeded ${custs.length} existing customers.`);
  }

  // 3. Seed Document Text files
  const docTextPath = resolveFilePath('case_02_document_text_sample_V1.0.jsonl');
  const docTextMap: Map<string, string> = new Map();
  if (docTextPath) {
    const lines = fs.readFileSync(docTextPath, 'utf-8').split('\n').filter((l) => l.trim().length > 0);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      docTextMap.set(parsed.doc_id, parsed.text);
    }
    console.log(`[Seed] Loaded ${docTextMap.size} document texts from sample.`);
  }

  // 4. Seed Documents sample
  const docsSamplePath = resolveFilePath('case_02_documents_sample_V1.0.csv');
  if (docsSamplePath) {
    const docs: Array<any> = parse(fs.readFileSync(docsSamplePath, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const row of docs) {
      const docId = row.doc_id.trim();
      const text = docTextMap.get(docId) || 'SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT';
      const buffer = Buffer.from(text, 'utf-8');

      const saved = await documentStorage.saveDocument(docId, row.file_name, buffer, 'text/plain');

      await DocumentModel.findOneAndUpdate(
        { docId },
        {
          docId,
          applicationId: row.application_id,
          fileName: row.file_name,
          declaredDocType: row.declared_doc_type as DeclaredDocType,
          classifiedDocType: 'OTHER',
          docTypeConfidence: 0.0,
          fileHash: saved.fileHash,
          fileSize: saved.fileSize,
          mimeType: 'text/plain',
          storagePath: saved.storagePath,
          text,
          version: 1,
        },
        { upsert: true }
      );
    }
    console.log(`[Seed] Seeded ${docs.length} sample documents.`);
  }

  // 5. Seed Applications sample (Worked Examples 1 to 10 + remaining)
  const appSamplePath = resolveFilePath('case_02_applications_sample_V1.0.csv');
  if (appSamplePath) {
    const apps: Array<any> = parse(fs.readFileSync(appSamplePath, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
    });

    const appsToProcess = isTest ? apps.slice(0, 10) : apps;

    for (const row of appsToProcess) {
      const appId = row.application_id;
      const applicantId = appId === 'A2000001' ? 'applicant1' : `user_${appId}`;

      await Application.findOneAndUpdate(
        { applicationId: appId },
        {
          applicationId: appId,
          applicantId,
          applicationDate: row.application_date,
          fullName: row.full_name,
          dob: row.dob,
          gender: row.gender,
          panNumber: row.pan_number,
          aadhaarLast4: row.aadhaar_last4 || row.aadhaarLast4,
          mobile: row.mobile,
          email: row.email,
          address: row.address,
          city: row.city,
          state: row.state,
          pincode: row.pincode,
          occupationCode: row.occupation_code,
          annualIncome: parseFloat(row.annual_income) || 0,
          consentKyc: true,
          status: 'SUBMITTED',
          version: 1,
        },
        { upsert: true }
      );

      // Process through state machine to generate rule results and queue statuses
      await stateMachine.processApplication(appId, 'system', 'ADMIN');
    }
    console.log(`[Seed] Seeded and evaluated ${appsToProcess.length} sample applications.`);
  }

  console.log('[Seed] Seeding completed successfully.');
}

// Direct execution from CLI
if (process.argv[1]?.includes('seed')) {
  (async () => {
    try {
      await connectDatabase();
      await runSeed(false);
      console.log('[Seed] Completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    }
  })();
}
