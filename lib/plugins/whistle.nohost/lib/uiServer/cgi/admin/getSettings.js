module.exports = (ctx) => {
  const {
    jsonDataStr,
    rulesTpl,
    defaultRules,
    accountRules,
    testRules,
    entryPatterns,
    specPattern,
  } = ctx.accountMgr;
  ctx.body = {
    ec: 0,
    jsonData: jsonDataStr,
    authKey: ctx.accountMgr.getAuthKey(),
    rulesTpl,
    defaultRules,
    accountRules,
    testRules,
    entryPatterns,
    specPattern,
  };
};
