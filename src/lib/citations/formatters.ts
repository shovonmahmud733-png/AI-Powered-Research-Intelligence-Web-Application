import { Paper } from '../db/types';

export type CitationStyle = 'apa7' | 'ieee' | 'mla' | 'chicago' | 'harvard' | 'bibtex' | 'ris';

export function formatAuthorList(authors: string[], style: CitationStyle): string {
  if (!authors || authors.length === 0) return 'Anonymous';

  if (style === 'apa7' || style === 'harvard') {
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  if (style === 'ieee') {
    if (authors.length === 1) return authors[0];
    if (authors.length <= 3) return authors.join(', ');
    return `${authors[0]} et al.`;
  }

  if (style === 'mla') {
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`;
    return `${authors[0]}, et al.`;
  }

  return authors.join(', ');
}

export function formatCitation(paper: Paper, style: CitationStyle): string {
  const authorsStr = formatAuthorList(paper.authors, style);
  const year = paper.publicationYear || 'n.d.';
  const title = paper.title.replace(/^\[DEMO.*?\]\s*/i, '');
  const journal = paper.journalOrConference || 'Scholarly Publication';
  const doi = paper.doi ? `https://doi.org/${paper.doi}` : '';

  switch (style) {
    case 'apa7':
      return `${authorsStr} (${year}). ${title}. ${journal}.${doi ? ' ' + doi : ''}`;

    case 'ieee':
      return `${authorsStr}, "${title}," ${journal}, ${year}.${doi ? ' doi: ' + paper.doi : ''}`;

    case 'mla':
      return `${authorsStr}. "${title}." ${journal}, ${year}.${doi ? ' ' + doi : ''}`;

    case 'chicago':
      return `${authorsStr}. "${title}." ${journal} (${year}).${doi ? ' ' + doi : ''}`;

    case 'harvard':
      return `${authorsStr} ${year}, '${title}', ${journal}.${doi ? ' Available from: ' + doi : ''}`;

    case 'bibtex': {
      const citeKey = `${(paper.authors[0] || 'author').split(/[\s,]+/)[0].toLowerCase()}${year}`;
      return `@article{${citeKey},
  author = {${paper.authors.join(' and ')}},
  title = {${title}},
  journal = {${journal}},
  year = {${year}},${paper.doi ? `\n  doi = {${paper.doi}},` : ''}${paper.url ? `\n  url = {${paper.url}}` : ''}
}`;
    }

    case 'ris':
      return `TY  - JOUR
TI  - ${title}
${paper.authors.map((a) => `AU  - ${a}`).join('\n')}
PY  - ${year}
JO  - ${journal}
${paper.doi ? `DO  - ${paper.doi}\n` : ''}${paper.url ? `UR  - ${paper.url}\n` : ''}ER  -`;

    default:
      return `${authorsStr} (${year}). ${title}. ${journal}.`;
  }
}
