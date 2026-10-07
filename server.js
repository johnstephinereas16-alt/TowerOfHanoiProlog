const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

function findSwipl() {
  const candidates = [
    'swipl',
    'C:\\Program Files\\swipl\\bin\\swipl.exe',
    'C:\\Program Files (x86)\\swipl\\bin\\swipl.exe',
  ];
  for (const p of candidates) {
    if (p === 'swipl' || fs.existsSync(p)) return p;
  }
  return 'swipl';
}
const SWIPL = findSwipl();
const PROLOG_FILE = path.join(__dirname, 'prolog', 'hanoi.pl');

console.log('Using SWI-Prolog at:', SWIPL);

app.get('/solve', (req, res) => {
  const n = parseInt(req.query.disks, 10);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    return res.status(400).json({ error: 'disks must be an integer 1..10' });
  }
  execFile(
    SWIPL,
    ['-g', `solve(${n})`, '-t', 'halt', PROLOG_FILE],
    { timeout: 5000, windowsHide: true },
    (err, stdout, stderr) => {
      if (err) {
        console.error('Prolog error:', stderr || err.message);
        return res.status(500).json({
          error: 'Prolog failed',
          detail: (stderr || err.message).toString(),
          tried: SWIPL,
        });
      }
      try {
        res.json({ moves: JSON.parse(stdout.trim()) });
      } catch (e) {
        console.error('Bad Prolog output:', stdout);
        res.status(500).json({ error: 'Bad Prolog output', raw: stdout });
      }
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hanoi server running at http://localhost:${PORT}`);
});