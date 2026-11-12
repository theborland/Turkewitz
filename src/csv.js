const REQUIRED_COLUMNS = [
  'intake appt date',
  'student last',
  'student first',
  'dob',
  'gr',
  'sch',
  'ml service',
  'id or olr',
  'test type',
  'overall',
  'oral',
];

export const SCHOOL_NAMES = Object.freeze({
  ACR: 'Amanda C. Rowe Elementary School',
  CMDN: 'Amanda C. Rowe Elementary School',
  CBHS: 'Casco Bay High School',
  DHS: 'Deering High School',
  EST: 'East End Community School',
  KMS: 'King Middle School',
  LGF: 'Longfellow Elementary School',
  LYS: 'Lyseth Elementary School',
  OCN: 'Ocean Avenue Elementary School',
  PATHS: 'Portland Arts & Technology High School',
  PHS: 'Portland High School',
  PRS: 'Presumpscot Elementary School',
  RCH: 'Howard C. Reiche Community School',
  TAL: 'Gerald E. Talbot Community School',
  YFO: 'Youth and Family Outreach',
  'SPP ACR': 'Specialized Program - Amanda C. Rowe Elementary School',
  'SPP LGF': 'Specialized Program - Longfellow Elementary School',
  'SPP PRS': 'Specialized Program - Presumpscot Elementary School',
  'SPP TAL': 'Specialized Program - Gerald E. Talbot Community School',
});

export function normalizeHeader(value) {
  return value.replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function parseCsv(contents) {
  const text = contents.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];

    if (inQuotes) {
      if (character === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      if (character === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error('The CSV has an unclosed quoted field.');
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV must include a header and at least one student row.');

  const headers = rows[0].map(normalizeHeader);
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(`The CSV is missing required columns: ${missing.join(', ')}.`);
  }

  return rows.slice(1).map((cells, index) => {
    const values = Object.fromEntries(
      headers.map((header, columnIndex) => [header, (cells[columnIndex] ?? '').trim()]),
    );
    if (cells.length > headers.length && cells.slice(headers.length).some((cell) => cell.trim())) {
      throw new Error(`Row ${index + 2} has more values than the header row.`);
    }
    return values;
  });
}

function get(row, column) {
  return (row[normalizeHeader(column)] ?? '').trim();
}

export function parseIntakeDate(value, year) {
  const match = value.match(/^\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!match) throw new Error(`Could not read the intake date "${value}".`);

  const month = Number(match[1]);
  const day = Number(match[2]);
  const parsedYear = match[3] ? Number(match[3]) : Number(year);
  const fullYear = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    !Number.isInteger(fullYear)
    || date.getUTCFullYear() !== fullYear
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`The intake date "${value}" is not a valid date.`);
  }
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${fullYear}`;
}

export function prepareStudent(row, rowNumber, year) {
  const firstName = get(row, 'Student FIRST');
  const lastName = get(row, 'Student LAST');
  const studentId = get(row, 'ID or OLR');
  const grade = get(row, 'GR');
  const schoolCode = get(row, 'SCH').toUpperCase();
  const mlService = get(row, 'ML Service').toUpperCase();
  const testType = get(row, 'Test Type');
  const overall = get(row, 'Overall');
  const oral = get(row, 'Oral');

  if (!firstName || !lastName) throw new Error(`Row ${rowNumber}: first and last names are required.`);
  if (!studentId) throw new Error(`Row ${rowNumber}: student ID is required.`);
  if (!grade) throw new Error(`Row ${rowNumber}: grade is required.`);
  if (!get(row, 'DOB')) throw new Error(`Row ${rowNumber}: date of birth is required.`);
  if (!Object.hasOwn(SCHOOL_NAMES, schoolCode)) {
    throw new Error(`Row ${rowNumber}: unrecognized school code "${schoolCode}".`);
  }
  if (!['IELD', 'CALS', 'NOT ML'].includes(mlService)) {
    throw new Error(`Row ${rowNumber}: unrecognized ML Service "${mlService}".`);
  }
  if (!testType) throw new Error(`Row ${rowNumber}: test type is required.`);

  const rawDate = get(row, 'Intake Appt Date');
  if (!rawDate) throw new Error(`Row ${rowNumber}: intake appointment date is required.`);

  const scoreFields = ['Test Type', 'Overall', 'Oral', 'Listen', 'Speaking', 'Reading', 'Writing'];
  const noScore = scoreFields.some((field) => get(row, field).toUpperCase() === 'NO SCORE');
  let assessment = { kind: 'other', firstTest: '', firstScore: '', secondTest: '', secondScore: '' };

  if (noScore) {
    assessment = {
      ...assessment,
      firstTest: 'Observation',
      firstScore: 'N/A',
      secondTest: 'Language Use Survey',
      secondScore: 'N/A',
    };
  } else if (testType.toUpperCase().includes('WIDA SCREENER FOR K') && !overall) {
    assessment = {
      ...assessment,
      firstTest: 'WIDA SCREENER FOR K',
      firstScore: `Oral: ${oral || 'N/A'}`,
    };
  } else if (testType.toUpperCase().includes('WIDA SCREENER') && overall) {
    assessment = { ...assessment, kind: 'wida', composite: overall };
  } else {
    assessment = {
      ...assessment,
      firstTest: testType,
      firstScore: overall ? `Overall: ${overall}` : oral ? `Oral: ${oral}` : 'N/A',
    };
  }

  return {
    name: `${firstName} ${lastName}`,
    studentId,
    dateOfBirth: get(row, 'DOB'),
    date: parseIntakeDate(rawDate, year),
    grade,
    school: SCHOOL_NAMES[schoolCode],
    mlService,
    preKindergarten: grade.toUpperCase() === 'PK',
    assessment,
  };
}

export function prepareStudents(rows, year) {
  return rows.map((row, index) => prepareStudent(row, index + 2, year));
}
