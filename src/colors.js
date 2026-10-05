const enabled = process.env.NO_COLOR === undefined;

const codes = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const colors = {};
for (const [name, code] of Object.entries(codes)) {
  colors[name] = enabled ? code : '';
}

module.exports = colors;
