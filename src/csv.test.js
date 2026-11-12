import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseIntakeDate, prepareStudents } from './csv.js';

const headers = [
  'Intake\nAppt\nDate',
  'Student\nLAST',
  'Student\nFIRST',
  'DOB',
  'GR',
  'SCH',
  'ML\nService',
  'ID\nor\nOLR',
  'Test\nType',
  'Oral',
  'Overall',
].map((header) => `"${header}"`).join(',');

test('parses quoted CSV headers and commas in values', () => {
  const rows = parseCsv(`${headers}\r\n"10/13 1000 T","Doe, Jr.","Alex","01/02/2018","2","TAL","IELD","1001","WIDA SCREENER","2.0","3.5"\r\n`);
  const students = prepareStudents(rows, 2026);
  assert.equal(students.length, 1);
  assert.equal(students[0].name, 'Alex Doe, Jr.');
  assert.equal(students[0].school, 'Gerald E. Talbot Community School');
  assert.equal(students[0].date, '10/13/2026');
  assert.equal(students[0].assessment.kind, 'wida');
  assert.equal(students[0].assessment.composite, '3.5');
});

test('recognizes NO SCORE and kindergarten WIDA assessments', () => {
  const rows = parseCsv([
    headers,
    '"10/13 1000 T","NoScore","Student","01/02/2018","1","DHS","CALS","1002","NO SCORE","",""',
    '"10/14 1000 W","Kindergarten","Student","01/02/2020","K","TAL","IELD","1003","WIDA SCREENER FOR K","1.5",""',
  ].join('\n'));
  const students = prepareStudents(rows, 2026);
  assert.equal(students[0].assessment.firstTest, 'Observation');
  assert.equal(students[0].assessment.secondTest, 'Language Use Survey');
  assert.equal(students[1].assessment.firstTest, 'WIDA SCREENER FOR K');
  assert.equal(students[1].assessment.firstScore, 'Oral: 1.5');
});

test('supports Pre-K eligibility in addition to ML Service decisions', () => {
  const rows = parseCsv(`${headers}\n"10/22 1000 Th","PreK","Student","04/24/2022","PK","YFO","IELD","1004","PreIPT","","1.0"`);
  const [student] = prepareStudents(rows, 2026);
  assert.equal(student.preKindergarten, true);
  assert.equal(student.mlService, 'IELD');
  assert.equal(student.assessment.firstTest, 'PreIPT');
  assert.equal(student.assessment.firstScore, 'Overall: 1.0');
});

test('rejects invalid school codes, dates, and malformed quoted CSV', () => {
  assert.throws(() => parseCsv(`${headers}\n"unterminated`), /unclosed quoted field/);
  assert.throws(() => parseIntakeDate('02/30 1000 M', 2026), /not a valid date/);
  const rows = parseCsv(`${headers}\n"10/13 1000 T","Doe","Alex","01/02/2018","2","UNKNOWN","IELD","1001","WIDA SCREENER","2.0","3.5"`);
  assert.throws(() => prepareStudents(rows, 2026), /unrecognized school code/);
});
