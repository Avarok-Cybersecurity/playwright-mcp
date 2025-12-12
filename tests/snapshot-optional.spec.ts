/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect } from './fixtures.js';

test('snapshots are not included by default', async ({ client, server }) => {
  server.setContent('/', `
    <title>Test Page</title>
    <button>Click me</button>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Click without includeSnapshot should not include pageState
  const resultWithoutSnapshot = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Click me button',
      ref: 'e2',
    },
  });

  expect(resultWithoutSnapshot).toHaveResponse({
    code: `await page.getByRole('button', { name: 'Click me' }).click();`,
    pageState: undefined,
  });

  // Click with includeSnapshot: true should include pageState
  const resultWithSnapshot = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Click me button',
      ref: 'e2',
      includeSnapshot: true,
    },
  });

  expect(resultWithSnapshot).toHaveResponse({
    code: `await page.getByRole('button', { name: 'Click me' }).click();`,
    pageState: expect.stringContaining(`- button "Click me"`),
  });
});

test('navigate without snapshot by default', async ({ client, server }) => {
  server.setContent('/', `
    <title>Test Page</title>
    <h1>Hello World</h1>
  `, 'text/html');

  // Navigate without includeSnapshot
  const resultWithoutSnapshot = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  expect(resultWithoutSnapshot).toHaveResponse({
    code: `await page.goto('${server.PREFIX}');`,
    pageState: undefined,
  });

  // Navigate with includeSnapshot: true
  const resultWithSnapshot = await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url: server.PREFIX,
      includeSnapshot: true,
    },
  });

  expect(resultWithSnapshot).toHaveResponse({
    code: `await page.goto('${server.PREFIX}');`,
    pageState: expect.stringContaining('Hello World'),
  });
});

test('browser_snapshot always includes snapshot', async ({ client, server }) => {
  server.setContent('/', `
    <title>Test Page</title>
    <h1>Always Snapshot</h1>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // browser_snapshot should always include the snapshot
  const result = await client.callTool({
    name: 'browser_snapshot',
    arguments: {},
  });

  expect(result).toHaveResponse({
    pageState: expect.stringContaining('Always Snapshot'),
  });
});

test('snapshot respects maxTokens parameter', async ({ client, server }) => {
  // Create a page with lots of content
  const longContent = Array(500).fill(null).map((_, i) =>
    `<div id="item-${i}">Content ${i}</div>`
  ).join('');

  server.setContent('/', `
    <title>Large Page</title>
    ${longContent}
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Test with small maxTokens to force truncation
  const result = await client.callTool({
    name: 'browser_snapshot',
    arguments: {
      maxTokens: 100,
      page: 0
    },
  });

  // Check that the response contains truncation warning
  const responseText = result.content[0].text;
  expect(responseText).toContain('⚠️ Snapshot Truncated');
  expect(responseText).toContain('Page 1 of');
  expect(responseText).toContain('Content exceeds 100 tokens');
});

test('snapshot handles pagination correctly', async ({ client, server }) => {
  // Create a page with lots of content
  const longContent = Array(1000).fill(null).map((_, i) =>
    `<div id="item-${i}">Content ${i}</div>`
  ).join('');

  server.setContent('/', `
    <title>Very Large Page</title>
    ${longContent}
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Get first page
  const page0 = await client.callTool({
    name: 'browser_snapshot',
    arguments: {
      maxTokens: 500,
      page: 0
    },
  });

  // Get second page
  const page1 = await client.callTool({
    name: 'browser_snapshot',
    arguments: {
      maxTokens: 500,
      page: 1
    },
  });

  // Both should have truncation warning
  const text0 = page0.content[0].text;
  const text1 = page1.content[0].text;

  expect(text0).toContain('⚠️ Snapshot Truncated');
  expect(text1).toContain('⚠️ Snapshot Truncated');

  // Check page numbers
  expect(text0).toContain('Page 1 of');
  expect(text1).toContain('Page 2 of');
});

test('snapshot handles out of range page numbers', async ({ client, server }) => {
  server.setContent('/', `
    <title>Small Page</title>
    <p>Small content</p>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Request page that doesn't exist
  const result = await client.callTool({
    name: 'browser_snapshot',
    arguments: {
      maxTokens: 1000,
      page: 10
    },
  });

  // Check for error message in page state
  expect(result).toHaveResponse({
    pageState: expect.stringContaining('Error: Page 10 out of range'),
  });
});

test('no truncation for small content', async ({ client, server }) => {
  server.setContent('/', `
    <title>Small Page</title>
    <h1>Small Page</h1>
    <p>This is a small page.</p>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  const result = await client.callTool({
    name: 'browser_snapshot',
    arguments: {
      maxTokens: 24000,
      page: 0
    },
  });

  // Should not have truncation warning
  const responseText = result.content[0].text;
  expect(responseText).not.toContain('⚠️ Snapshot Truncated');
  expect(result).toHaveResponse({
    pageState: expect.stringContaining('Small Page'),
  });
});

test('snapshot default parameters work correctly', async ({ client, server }) => {
  server.setContent('/', `
    <title>Test Page</title>
    <h1>Test Page</h1>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Call without parameters (should use defaults)
  const result = await client.callTool({
    name: 'browser_snapshot',
    arguments: {},
  });

  expect(result).toHaveResponse({
    pageState: expect.stringContaining('Test Page'),
  });
});
