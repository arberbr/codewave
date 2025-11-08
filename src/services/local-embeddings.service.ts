import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';

/**
 * Local TF-IDF based embeddings (no API calls, no cost, offline)
 * Suitable for small-to-medium sized documents like commit diffs
 */
export class LocalEmbeddings extends Embeddings {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private dimensions: number;

  constructor(params?: EmbeddingsParams & { dimensions?: number }) {
    super(params || {});
    this.dimensions = params?.dimensions || 128;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  /**
   * Build vocabulary and calculate IDF scores from documents
   */
  public buildVocabulary(documents: string[]): void {
    // Build vocabulary
    const allWords = new Set<string>();
    documents.forEach((doc) => {
      this.tokenize(doc).forEach((word) => allWords.add(word));
    });

    // Assign indices
    Array.from(allWords).forEach((word, index) => {
      this.vocabulary.set(word, index % this.dimensions);
    });

    // Calculate IDF scores
    const docFrequency = new Map<string, number>();
    documents.forEach((doc) => {
      const words = new Set(this.tokenize(doc));
      words.forEach((word) => {
        docFrequency.set(word, (docFrequency.get(word) || 0) + 1);
      });
    });

    docFrequency.forEach((freq, word) => {
      this.idf.set(word, Math.log(documents.length / freq));
    });
  }

  /**
   * Convert text to TF-IDF vector
   */
  private textToVector(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const words = this.tokenize(text);
    const termFreq = new Map<string, number>();

    // Calculate term frequency
    words.forEach((word) => {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    });

    // Build TF-IDF vector
    termFreq.forEach((tf, word) => {
      const index = this.vocabulary.get(word);
      const idf = this.idf.get(word) || 0;
      if (index !== undefined) {
        vector[index] += tf * idf;
      }
    });

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Embed a single query
   */
  async embedQuery(text: string): Promise<number[]> {
    if (this.vocabulary.size === 0) {
      throw new Error('Vocabulary not built. Call buildVocabulary() first.');
    }
    return this.textToVector(text);
  }

  /**
   * Embed multiple documents
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    if (this.vocabulary.size === 0) {
      this.buildVocabulary(documents);
    }
    return documents.map((doc) => this.textToVector(doc));
  }
}
