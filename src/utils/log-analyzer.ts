export interface LogLocation {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
  raw: string;
}

export interface LogAnalysis {
  errorLines: string[];
  locations: LogLocation[];
  probableFiles: string[];
}

const locationPatterns = [
  /(?<file>[A-Za-z]:\\[^:\r\n]+?\.[\w]+):(?<line>\d+):(?<column>\d+)/g,
  /(?<file>(?:\.{1,2}\/|\/)?[\w./-]+?\.[\w]+):(?<line>\d+):(?<column>\d+)/g,
  /(?<file>[A-Za-z]:\\[^()\r\n]+?\.[\w]+)\((?<line>\d+),(?<column>\d+)\)/g,
  /(?<file>(?:\.{1,2}\/|\/)?[\w./-]+?\.[\w]+)\((?<line>\d+),(?<column>\d+)\)/g,
];

const errorLinePattern = /(error|fail|failed|failure|exception|traceback|cannot|could not|not found|syntaxerror|typeerror|referenceerror|assertionerror|ts\d{4})/i;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function analyzeLogContent(content: string, maxResults = 50): LogAnalysis {
  const errorLines: string[] = [];
  const locations: LogLocation[] = [];
  const seenLocations = new Set<string>();

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (errorLines.length < maxResults && errorLinePattern.test(line)) {
      errorLines.push(line.trim());
    }

    for (const pattern of locationPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(line)) !== null && locations.length < maxResults) {
        const groups = match.groups;
        if (!groups?.file) {
          continue;
        }

        const filePath = normalizePath(groups.file);
        const key = `${filePath}:${groups.line ?? ""}:${groups.column ?? ""}`;
        if (seenLocations.has(key)) {
          continue;
        }

        seenLocations.add(key);
        const location: LogLocation = {
          filePath,
          raw: line.trim(),
        };
        if (groups.line) {
          location.lineNumber = Number(groups.line);
        }
        if (groups.column) {
          location.columnNumber = Number(groups.column);
        }
        locations.push(location);
      }
    }
  }

  const probableFiles = Array.from(new Set(locations.map(location => location.filePath)));
  return { errorLines, locations, probableFiles };
}
