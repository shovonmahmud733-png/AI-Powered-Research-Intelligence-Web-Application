import { ScholarlyProvider, ScholarlySearchParams, SearchResultPaper } from './provider';
import { calculateTransparentRelevance } from './relevance';

export class CrossrefProvider implements ScholarlyProvider {
  name = 'Crossref Scholarly Metadata API';

  async search(params: ScholarlySearchParams): Promise<{ papers: SearchResultPaper[]; total: number }> {
    const limit = params.limit || 15;
    const offset = params.offset || 0;
    const url = new URL('https://api.crossref.org/works');
    if (params.query) {
      url.searchParams.set('query', params.query);
    }
    if (params.author) {
      url.searchParams.set('query.author', params.author);
    }
    if (params.doi) {
      url.searchParams.set('query.bibliographic', params.doi);
    }
    url.searchParams.set('rows', String(limit));
    url.searchParams.set('offset', String(offset));

    const filters: string[] = [];
    if (params.year) {
      filters.push(`from-pub-date:${params.year}-01-01`);
      filters.push(`until-pub-date:${params.year}-12-31`);
    }
    if (params.openAccessOnly) {
      filters.push('has-license:true');
    }
    if (filters.length > 0) {
      url.searchParams.set('filter', filters.join(','));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'ResearchIntelligencePlatform/1.0 (mailto:researcher@university.edu; Academic Research Tool)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Crossref API responded with status ${res.status}`);
      }

      const json = await res.json();
      const items = json?.message?.items || [];
      const total = json?.message?.['total-results'] || 0;

      const papers: SearchResultPaper[] = items.map((item: any) => {
        const title = Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled Academic Paper';
        const authors = (item.author || []).map(
          (a: any) => `${a.family || ''}${a.given ? ', ' + a.given : ''}`
        );

        // Strip JATS tags from abstract if present
        let abstract = item.abstract || '';
        if (abstract) {
          abstract = abstract.replace(/<[^>]+>/g, '').trim();
        } else {
          abstract = 'No abstract provided in Crossref registry for this publication record.';
        }

        const pubYear =
          item['published-print']?.['date-parts']?.[0]?.[0] ||
          item['published-online']?.['date-parts']?.[0]?.[0] ||
          item.created?.['date-parts']?.[0]?.[0] ||
          new Date().getFullYear();

        const journal = Array.isArray(item['container-title'])
          ? item['container-title'][0]
          : item['container-title'] || 'Scholarly Journal / Proceedings';

        const doi = item.DOI || '';
        const paperUrl = item.URL || (doi ? `https://doi.org/${doi}` : '');

        // Detect open access link if present in link array
        let openAccessUrl: string | undefined = undefined;
        if (Array.isArray(item.link)) {
          const pdfLink = item.link.find(
            (l: any) => l['content-type']?.includes('pdf') || l['content-version'] === 'vor'
          );
          if (pdfLink?.URL) {
            openAccessUrl = pdfLink.URL;
          }
        }

        // Retraction or correction detection
        let retractionStatus: 'clean' | 'retracted' | 'corrected' | 'under_review' = 'clean';
        let retractionDetails: string | undefined = undefined;
        if (item['update-to']) {
          retractionStatus = 'corrected';
          retractionDetails = `Publication has ${item['update-to'].length} documented update/correction notices in Crossref.`;
        }

        const citationCount = item['is-referenced-by-count'] || 0;

        const relevance = calculateTransparentRelevance(
          { title, abstract, publicationYear: pubYear, journalOrConference: journal },
          params
        );

        return {
          id: `cr-${doi ? doi.replace(/[^a-zA-Z0-9]/g, '_') : Math.random().toString(36).substring(2, 9)}`,
          doi,
          title,
          authors: authors.length > 0 ? authors : ['Author metadata unindexed'],
          abstract,
          publicationYear: pubYear,
          journalOrConference: journal,
          url: paperUrl,
          openAccessUrl,
          citationCount,
          sourceProvider: 'crossref',
          sourceId: doi,
          references: [],
          retrievalDate: new Date().toISOString(),
          metadataStatus: doi ? 'verified' : 'partial',
          retractionStatus,
          retractionDetails,
          relevance,
        };
      });

      let filteredPapers = papers;
      if (params.author) {
        const authorLower = params.author.toLowerCase().trim();
        filteredPapers = filteredPapers.filter((p) =>
          p.authors.some((a) => a.toLowerCase().includes(authorLower))
        );
      }
      if (params.doi) {
        const doiLower = params.doi.toLowerCase().trim();
        filteredPapers = filteredPapers.filter((p) =>
          p.doi?.toLowerCase().includes(doiLower)
        );
      }

      return { papers: filteredPapers, total: filteredPapers.length > 0 ? total : 0 };
    } catch (err: any) {
      console.warn('Crossref API request failed or timed out:', err.message);
      return { papers: [], total: 0 };
    }
  }

  async getByDoi(doi: string): Promise<SearchResultPaper | null> {
    try {
      const cleanDoi = doi.trim();
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
        headers: {
          'User-Agent': 'ResearchIntelligencePlatform/1.0 (mailto:researcher@university.edu)',
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      const item = json?.message;
      if (!item) return null;

      const title = Array.isArray(item.title) ? item.title[0] : item.title;
      const authors = (item.author || []).map(
        (a: any) => `${a.family || ''}${a.given ? ', ' + a.given : ''}`
      );
      const pubYear =
        item['published-print']?.['date-parts']?.[0]?.[0] ||
        item['published-online']?.['date-parts']?.[0]?.[0] ||
        item.created?.['date-parts']?.[0]?.[0] ||
        new Date().getFullYear();

      return {
        id: `cr-${cleanDoi.replace(/[^a-zA-Z0-9]/g, '_')}`,
        doi: cleanDoi,
        title,
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        abstract: item.abstract ? item.abstract.replace(/<[^>]+>/g, '').trim() : '',
        publicationYear: pubYear,
        journalOrConference: Array.isArray(item['container-title'])
          ? item['container-title'][0]
          : item['container-title'] || '',
        url: item.URL || `https://doi.org/${cleanDoi}`,
        citationCount: item['is-referenced-by-count'] || 0,
        sourceProvider: 'crossref',
        sourceId: cleanDoi,
        references: [],
        retrievalDate: new Date().toISOString(),
        metadataStatus: 'verified',
        retractionStatus: item['update-to'] ? 'corrected' : 'clean',
        relevance: { score: 95, reasons: ['Direct DOI lookup verification'], mismatches: [], confidence: 'high' },
      };
    } catch (err) {
      return null;
    }
  }
}
