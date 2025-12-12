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

test.describe('maxTokens parameter across tools', () => {
  // Helper to create a large content page
  const createLargeContent = () => {
    return Array(1000).fill(null).map((_, i) =>
      `<div id="item-${i}">Content ${i} with some additional text to make it longer</div>`
    ).join('');
  };

  test('browser_click respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Test Page</title>
      <button>Click me</button>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test with small maxTokens
    const result = await client.callTool({
      name: 'browser_click',
      arguments: {
        element: 'Click me button',
        ref: 'e2',
        includeSnapshot: true,
        maxTokens: 100,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 100 tokens');
  });

  test('browser_navigate respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Large Page</title>
      ${createLargeContent()}
    `, 'text/html');

    const result = await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: server.PREFIX,
        includeSnapshot: true,
        maxTokens: 150,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 150 tokens');
  });

  test('browser_type respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Form Page</title>
      <input type="text" placeholder="Enter text" />
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_type',
      arguments: {
        element: 'text input',
        ref: 'e2',
        text: 'Hello World',
        includeSnapshot: true,
        maxTokens: 200,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 200 tokens');
  });

  test('browser_hover respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Hover Test</title>
      <div id="hoverable">Hover over me</div>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_hover',
      arguments: {
        element: 'hoverable div',
        ref: 'e2',
        includeSnapshot: true,
        maxTokens: 80,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 80 tokens');
  });

  test('browser_select_option respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Select Test</title>
      <select>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </select>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_select_option',
      arguments: {
        element: 'dropdown',
        ref: 'e2',
        values: ['2'],
        includeSnapshot: true,
        maxTokens: 120,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 120 tokens');
  });

  test('browser_press_key respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Keyboard Test</title>
      <input type="text" />
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_press_key',
      arguments: {
        key: 'Tab',
        includeSnapshot: true,
        maxTokens: 90,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 90 tokens');
  });

  test('browser_navigate_back respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `<title>Page 1</title><a href="/page2">Go to page 2</a>`, 'text/html');
    server.setContent('/page2', `
      <title>Page 2</title>
      <p>This is page 2</p>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX + '/page2' },
    });

    const result = await client.callTool({
      name: 'browser_navigate_back',
      arguments: {
        includeSnapshot: true,
        maxTokens: 110,
      },
    });

    // Back to page 1 which has less content, so no truncation
    expect(result).toHaveResponse({
      pageState: expect.stringContaining('Page 1'),
    });
  });

  test('browser_wait_for respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Wait Test</title>
      <div>Loading...</div>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_wait_for',
      arguments: {
        text: 'Loading...',
        includeSnapshot: true,
        maxTokens: 75,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 75 tokens');
  });

  test('browser_tab_select respects maxTokens parameter', async ({ client, server }) => {
    server.setContent('/', `
      <title>Tab Test</title>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    await client.callTool({
      name: 'browser_tab_new',
      arguments: {},
    });

    const result = await client.callTool({
      name: 'browser_tab_select',
      arguments: {
        index: 0,
        includeSnapshot: true,
        maxTokens: 130,
      },
    });

    const responseText = result.content[0].text;
    expect(responseText).toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Content exceeds 130 tokens');
  });

  test('maxTokens defaults to 24000 when not specified', async ({ client, server }) => {
    // Create content that's large but less than 24000 tokens (96000 chars)
    const mediumContent = Array(500).fill(null).map((_, i) =>
      `<div>Item ${i}</div>`
    ).join('');

    server.setContent('/', `
      <title>Medium Page</title>
      ${mediumContent}
    `, 'text/html');

    const result = await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: server.PREFIX,
        includeSnapshot: true,
        // maxTokens not specified, should use default 24000
      },
    });

    const responseText = result.content[0].text;
    // Should not be truncated because content is smaller than default
    expect(responseText).not.toContain('⚠️ Snapshot Truncated');
    expect(responseText).toContain('Medium Page');
  });

  test('pagination works with different maxTokens values', async ({ client, server }) => {
    server.setContent('/', `
      <title>Pagination Test</title>
      ${createLargeContent()}
    `, 'text/html');

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Get first page with small maxTokens
    const page0 = await client.callTool({
      name: 'browser_snapshot',
      arguments: {
        maxTokens: 50,
        page: 0,
      },
    });

    // Get second page
    const page1 = await client.callTool({
      name: 'browser_snapshot',
      arguments: {
        maxTokens: 50,
        page: 1,
      },
    });

    const text0 = page0.content[0].text;
    const text1 = page1.content[0].text;

    // Both should show truncation
    expect(text0).toContain('⚠️ Snapshot Truncated');
    expect(text1).toContain('⚠️ Snapshot Truncated');

    // Should show different page numbers
    expect(text0).toContain('Page 1 of');
    expect(text1).toContain('Page 2 of');

    // Should show the maxTokens value
    expect(text0).toContain('Content exceeds 50 tokens');
    expect(text1).toContain('Content exceeds 50 tokens');
  });
});
