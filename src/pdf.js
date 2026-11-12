import { PDFDocument, StandardFonts } from 'pdf-lib';

const FIELD_WIDTHS = Object.freeze({
  Text1: 252,
  Date: 77,
  Text2: 300,
  Grade: 77,
  Text3: 238,
  'Student ID': 89,
  Text9: 150,
  Text10: 150,
  Text14: 130,
  Score: 105,
  Text15: 130,
  Score_2: 105,
});

function setTextField(form, font, name, value) {
  const field = form.getTextField(name);
  field.setText(value ?? '');
  if (!value) return;

  const width = FIELD_WIDTHS[name];
  if (!width) throw new Error(`The template field "${name}" has no configured width.`);
  let fontSize = 11;
  while (fontSize > 7 && font.widthOfTextAtSize(value, fontSize) > width - 8) {
    fontSize -= 0.5;
  }
  if (font.widthOfTextAtSize(value, fontSize) > width - 8) {
    throw new Error(`Text for "${name}" is too long to fit on the form.`);
  }
  field.setFontSize(fontSize);
}

function setCheckBox(form, name, checked) {
  const field = form.getCheckBox(name);
  if (checked) field.check();
  else field.uncheck();
}

export function fillStudentForm(form, student, font) {
  const textFields = {
    Text1: student.name,
    Date: student.date,
    Text2: student.school,
    Grade: student.grade,
    Text3: student.dateOfBirth,
    'Student ID': student.studentId,
    Text9: '',
    Text10: student.assessment.kind === 'wida' ? `Composite: ${student.assessment.composite}` : '',
    Text14: student.assessment.firstTest,
    Score: student.assessment.firstScore,
    Text15: student.assessment.secondTest,
    Score_2: student.assessment.secondScore,
  };
  for (const [name, value] of Object.entries(textFields)) {
    setTextField(form, font, name, value);
  }

  setCheckBox(form, 'Check Box4', student.mlService === 'IELD');
  setCheckBox(form, 'Check Box5', student.mlService === 'CALS');
  setCheckBox(form, 'Check Box6', student.preKindergarten);
  setCheckBox(form, 'Check Box7', student.mlService === 'NOT ML');
  setCheckBox(form, 'Check Box8', false);
  setCheckBox(form, 'Check Box11', student.assessment.kind === 'wida');
  setCheckBox(form, 'Check Box12', true);
  setCheckBox(form, 'Check Box13', student.assessment.kind !== 'wida');
}

export async function createCombinedPdf(templateBytes, students, onProgress = () => {}) {
  const output = await PDFDocument.create();

  for (let index = 0; index < students.length; index += 1) {
    const pdf = await PDFDocument.load(templateBytes);
    const form = pdf.getForm();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    fillStudentForm(form, students[index], font);
    form.updateFieldAppearances(font);
    form.flatten({ updateFieldAppearances: false });

    const [page2] = pdf.getPages().slice(1);
    const idStamp = `Student ID#: ${students[index].studentId}`;
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(idStamp, fontSize);
    page2.drawText(idStamp, {
      x: 560 - textWidth,
      y: page2.getHeight() - 75,
      size: fontSize,
      font,
    });

    const pages = await output.copyPages(pdf, [0, 1]);
    pages.forEach((page) => output.addPage(page));
    onProgress(index + 1, students.length);
  }

  return output.save();
}
