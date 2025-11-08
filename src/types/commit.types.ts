export interface CommitInfo {
  hash: string;
  author: string;
  message: string;
  diff: string;
  filesChanged: string[];
}
