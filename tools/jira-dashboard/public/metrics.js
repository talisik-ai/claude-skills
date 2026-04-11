export function computeMetrics(issues) {
  const withSession = issues.filter(i => i.fields.session_count !== null);
  const withAI = issues.filter(i => i.fields.ai_assisted !== null);
  const withRework = issues.filter(i => i.fields.rework_required !== null);

  const oneSessionCount = withSession.filter(i => Number(i.fields.session_count) === 1).length;
  const aiYCount = withAI.filter(i => i.fields.ai_assisted === 'Y').length;
  const reworkYCount = withRework.filter(i => i.fields.rework_required === 'Y').length;
  const totalSessionSum = withSession.reduce((sum, i) => sum + Number(i.fields.session_count), 0);

  const flagged = issues.filter(i =>
    Number(i.fields.session_count) > 1 || i.fields.rework_required === 'Y'
  );

  return {
    oneSessionRate: withSession.length > 0 ? oneSessionCount / withSession.length : null,
    oneSessionTotal: withSession.length,
    oneSessionMissing: issues.length - withSession.length,

    aiAssistedRate: withAI.length > 0 ? aiYCount / withAI.length : null,
    aiAssistedMissing: issues.length - withAI.length,

    reworkRate: withRework.length > 0 ? reworkYCount / withRework.length : null,
    reworkMissing: issues.length - withRework.length,

    avgSessionCount: withSession.length > 0 ? totalSessionSum / withSession.length : null,

    flagged,
  };
}

export function computePerDeveloper(issues) {
  const byDev = {};

  for (const issue of issues) {
    const { assignee } = issue.fields;
    if (!assignee) continue;
    const id = assignee.accountId;
    if (!byDev[id]) byDev[id] = { accountId: id, displayName: assignee.displayName, issues: [] };
    byDev[id].issues.push(issue);
  }

  return Object.values(byDev).map(({ accountId, displayName, issues: devIssues }) => {
    const withAI = devIssues.filter(i => i.fields.ai_assisted !== null);
    const withRework = devIssues.filter(i => i.fields.rework_required !== null);
    const withSession = devIssues.filter(i => i.fields.session_count !== null);

    return {
      accountId,
      displayName,
      cardCount: devIssues.length,
      aiAssistedRate: withAI.length > 0 ? withAI.filter(i => i.fields.ai_assisted === 'Y').length / withAI.length : null,
      reworkRate: withRework.length > 0 ? withRework.filter(i => i.fields.rework_required === 'Y').length / withRework.length : null,
      avgSessionCount: withSession.length > 0 ? withSession.reduce((s, i) => s + Number(i.fields.session_count), 0) / withSession.length : null,
    };
  });
}
