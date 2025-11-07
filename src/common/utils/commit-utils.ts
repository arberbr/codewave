export function parseCommitMessage(commitMessage: string): { type: string; scope?: string; subject: string } {
  const commitRegex = /^(?<type>\w+)(\((?<scope>[\w\s$.\-]*)\))?: (?<subject>.*)$/;
  const match = commitMessage.match(commitRegex);

  if (!match || !match.groups) {
    throw new Error('Invalid commit message format');
  }

  return {
    type: match.groups.type,
    scope: match.groups.scope,
    subject: match.groups.subject,
  };
}

export function isCommitMessageValid(commitMessage: string): boolean {
  const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore'];
  const { type } = parseCommitMessage(commitMessage);
  return validTypes.includes(type);
}

export function formatCommitMessage(commit: { type: string; scope?: string; subject: string }): string {
  const { type, scope, subject } = commit;
  return scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`;
}