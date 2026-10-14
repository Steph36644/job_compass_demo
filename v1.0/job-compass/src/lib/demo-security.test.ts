import assert from 'node:assert/strict';
import test from 'node:test';
import { aiFailureMessage, containsByokField, sanitizeChatMessages } from './ai-request';
import { MSG_AI_NOT_CONFIGURED, MSG_LOGIN_AI, MSG_LOGIN_CLOUD_READ } from './demo-messages';
import { looksLikeSecretKey, readPublicSupabase, resolveAiUpstream } from './public-env';
import { writePrimarySource } from './primary-source';
import { redactSecrets, storageKeyLooksSecret } from './redact';
import { loginFeatureCopy, mapAuthError, safeNextPath } from './safe-next-path';

test('空环境和占位符都视为未配置', () => {
  assert.equal(readPublicSupabase({}), null);
  assert.equal(readPublicSupabase({
    NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key',
  }), null);
});

test('拒绝把服务端私钥放进公开变量', () => {
  const url = 'https://visitorproject.supabase.co';
  assert.equal(readPublicSupabase({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_' + 'secret_not_real',
  }), null);
  assert.equal(looksLikeSecretKey('service' + '_role'), true);
  assert.equal(looksLikeSecretKey('sk' + '-not-real'), true);
});

test('接受访客自己的 https Supabase 项目和可公开的 anon key', () => {
  const cfg = readPublicSupabase({
    NEXT_PUBLIC_SUPABASE_URL: 'https://visitorproject.supabase.co/',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_demo_only',
  });
  assert.deepEqual(cfg, {
    url: 'https://visitorproject.supabase.co',
    anonKey: 'sb_publishable_demo_only',
  });
});

test('AI 上游只允许指定的 https 主机', () => {
  assert.equal(resolveAiUpstream('http://api.openai.com/v1'), null);
  assert.equal(resolveAiUpstream('https://evil.example/v1'), null);
  assert.equal(resolveAiUpstream(undefined)?.host, 'api.openai.com');
  assert.equal(resolveAiUpstream('https://api.deepseek.com/v1')?.endpoint, 'https://api.deepseek.com/v1/chat/completions');
});

test('登录回跳不能离开本站', () => {
  assert.equal(safeNextPath('https://evil.example'), '/');
  assert.equal(safeNextPath('//evil.example'), '/');
  assert.equal(safeNextPath('/profile#cloud-import'), '/profile#cloud-import');
});

test('登录文案和错误映射保持本地优先', () => {
  assert.match(loginFeatureCopy('ai'), /本地台账/);
  assert.equal(mapAuthError('Invalid login credentials'), '邮箱或密码不正确');
  assert.equal(mapAuthError('something else'), '登录没有完成，请稍后再试');
});

test('浏览器请求里的供应商字段会被拒绝', () => {
  assert.equal(containsByokField({ messages: [{ role: 'user', content: 'hello' }] }), false);
  assert.equal(containsByokField({ apiKey: 'not-used' }), true);
  assert.equal(sanitizeChatMessages({ messages: [{ role: 'user', content: 'hello' }] })?.length, 1);
  assert.equal(sanitizeChatMessages({ messages: [] }), null);
});

test('未登录和未配置 AI 使用固定提示', () => {
  assert.equal(aiFailureMessage(401, 'UNAUTHORIZED'), MSG_LOGIN_AI);
  assert.equal(aiFailureMessage(503, 'AI_NOT_CONFIGURED'), MSG_AI_NOT_CONFIGURED);
});

test('脱敏只替换疑似密钥，未登录不能切到云端', () => {
  const redacted = redactSecrets('prefix sk-' + 'abcd value');
  assert.equal(redacted.includes('abcd'), false);
  assert.equal(storageKeyLooksSecret('job-compass-ai-settings-v1'), true);
  assert.equal(storageKeyLooksSecret('job-compass-data-v1'), false);
  const blocked = writePrimarySource('cloud', false);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.message, MSG_LOGIN_CLOUD_READ);
});
