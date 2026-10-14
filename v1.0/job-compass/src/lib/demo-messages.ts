export const MSG_LOGIN_AI = '请先登录后再使用 AI。本地台账不受影响。';
export const MSG_LOGIN_AI_WITH_LOCAL =
  '请先登录后再使用 AI。本地台账不受影响，可以继续使用本地规则和手动记录。';
export const MSG_LOGIN_CLOUD_WRITE = '请先登录后再使用云端写入。本地台账不受影响。';
export const MSG_LOGIN_CLOUD_READ = '请先登录后再拉取云端数据或切换主源。本地台账不受影响。';
export const MSG_AI_NOT_CONFIGURED = '暂时无法调用 AI。请检查服务端是否已配置供应商 Key，然后重试。';
export const MSG_AI_RETRY = '暂时无法调用 AI。请稍后重试。若仍失败，请检查服务端配置。';
export const MSG_AI_DISCLAIMER = '模型可能会出错，建议可以忽略。核对后再决定是否写入台账。';
export const MSG_SWITCHED_CLOUD =
  '已切到云端为主。之后读取以云端为准；两边不一致时仍要人工确认，不会静默覆盖。';
export const MSG_STILL_LOCAL = '主源仍是本地，保存会继续双写到云端。';
export const MSG_ROLLBACK = '已回滚到导入前的备份。当前主源是本地，刚才的切换没有保留。';
export const MSG_MIGRATION = '云端表还没建好。请先执行 P1-A 的 migration。本地记录还在，可以再试。';
export const MSG_CLOUD_WRITE_FAILED = '云端没有写入成功。本地记录还在，可以再试。主源仍是本地。';
export const MSG_PRIMARY_LOCAL = '主源：本地';
export const MSG_PRIMARY_CLOUD = '主源：云端';
export const MSG_SIGNED_IN_LOCAL = '已连云端，主源仍是本地';
