import { test, expect } from '@playwright/test';

test.describe('Chat ERR_EMPTY_RESPONSE Diagnosis', () => {
  test('capture full diagnostic information', async ({ page }) => {
    // 1. 네트워크 및 콘솔 로그 캡처
    const networkLogs: any[] = [];
    const consoleLogs: any[] = [];

    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    page.on('request', request => {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      });
    });

    page.on('response', async response => {
      const url = response.url();
      networkLogs.push({
        type: 'response',
        url,
        status: response.status(),
        headers: response.headers(),
        bodyLength: url.includes('/api/chat')
          ? (await response.text().catch(() => '')).length
          : 'not captured'
      });
    });

    page.on('requestfailed', request => {
      networkLogs.push({
        type: 'request-failed',
        url: request.url(),
        failure: request.failure()
      });
    });

    // 2. 페이지 접속
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 3. 채팅 입력
    const input = page.locator('textarea[placeholder*="메시지"], textarea');
    await input.waitFor({ state: 'visible' });
    await input.fill('Create a simple counter component');

    // 4. 전송
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 5. /api/chat 요청/응답 대기 (10초)
    const chatRequest = await page.waitForRequest(
      req => req.url().includes('/api/chat'),
      { timeout: 10000 }
    ).catch(() => null);

    const chatResponse = await page.waitForResponse(
      res => res.url().includes('/api/chat'),
      { timeout: 10000 }
    ).catch(() => null);

    // 6. 진단 정보 출력
    console.log('\n=== DIAGNOSTIC REPORT ===\n');

    console.log('1. Chat Request:');
    if (chatRequest) {
      console.log('  ✓ URL:', chatRequest.url());
      console.log('  ✓ Method:', chatRequest.method());
      const postData = await chatRequest.postDataJSON();
      console.log('  ✓ Messages count:', postData?.messages?.length);
      console.log('  ✓ Files count:', Object.keys(postData?.files || {}).length);
    } else {
      console.log('  ❌ NO REQUEST TO /api/chat');
    }

    console.log('\n2. Chat Response:');
    if (chatResponse) {
      const status = chatResponse.status();
      const body = await chatResponse.text().catch(() => '');
      console.log('  - Status:', status);
      console.log('  - Body length:', body.length);
      console.log('  - Body preview:', body.substring(0, 200));

      if (status === 200 && body.length === 0) {
        console.log('  ⚠️  200 OK but EMPTY BODY - This is the ERR_EMPTY_RESPONSE cause!');
      }
    } else {
      console.log('  ❌ NO RESPONSE FROM /api/chat');
    }

    console.log('\n3. Console Errors:');
    const errors = consoleLogs.filter(log => log.type === 'error');
    errors.forEach(err => console.log('  -', err.text));

    console.log('\n4. Failed Requests:');
    const failed = networkLogs.filter(log => log.type === 'request-failed');
    failed.forEach(f => console.log('  -', f.url, '→', f.failure));

    // 7. 스크린샷
    await page.screenshot({
      path: 'tests/e2e/screenshots/diagnosis.png',
      fullPage: true
    });

    // 8. 기본 검증
    expect(chatRequest, 'Chat request should be sent').toBeTruthy();
    expect(chatResponse, 'Chat response should be received').toBeTruthy();
  });
});
