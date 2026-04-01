/**
 * @jest-environment jsdom
 */
$ = jQuery = require('jquery');
require('../json-viewer/jquery.json-viewer.js');

document.body.innerHTML = '<div id="json"></div>';

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
});

function getCopyButton(path) {
  return $('#json a.json-copy').filter((index, element) => {
    return $(element).attr('data-path') === JSON.stringify(path);
  });
}

test('withLinks option', () => {
  const data = {
    url: 'http://www.hello.com',
  };
  $('#json').jsonViewer(data, { withLinks: true });

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li>url: <a href="http://www.hello.com" class="json-string" target="_blank">http://www.hello.com</a></li></ul>}'
  );

  $('#json').jsonViewer(data, { withLinks: false });

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li>url: <span class="json-string">"http://www.hello.com"</span></li></ul>}'
  );
});

test('withLinks option, complex URL', () => {
  const data = {
    url: 'https://www.google.com/search?channel=fs&q=query+parameter+(no+regexp)',
  };
  $('#json').jsonViewer(data, { withLinks: true });

  expect($('#json a.json-string')[0].href).toEqual(data.url);
});

test('withQuotes option', () => {
  $('#json').jsonViewer({ 'hello': 'world' }, { withQuotes: false });

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li>hello: <span class="json-string">"world"</span></li></ul>}'
  );

  $('#json').jsonViewer({ 'hello': 'world' }, { withQuotes: true });

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li><span class="json-string">"hello"</span>: <span class="json-string">"world"</span></li></ul>}'
  );
});

/**
 * Tests for the presence of a script tag inside the 'json' id.
 * If none are found, the value was correctly escaped for XSS.
 */
function hasScripts(input) {
  $('#json').jsonViewer(input);
  const scriptsInJson = $('#json script');
  return scriptsInJson.length > 0;
}

test('XSS in object value', () => {
  const input = {
    'key_1': '<script>alert(1)</script>'
  };

  expect(hasScripts(input)).toEqual(false);
});

test('XSS in object key', () => {
  const input = {
    '<script>alert(1)</script>': 'val_1'
  };

  expect(hasScripts(input)).toEqual(false);
});

test('big integer in json displayed without rounding (implicit bigint)', () => {
  // Built-in datatype "bigint" differs from "number" and needs its own handling
  // javascript number type will display 66110734225681139 as 66110734225681140 due to lack of precision
  const data = {
    'big': 66110734225681139n,
  };
  $('#json').jsonViewer(data);

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li>big: <span class="json-literal">66110734225681139</span></li></ul>}'
  );
});

test('big integer in json as explicit BigInt', () => {
  const data = {
    'big': BigInt('66110734225681139'),
  };
  $('#json').jsonViewer(data);

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li>big: <span class="json-literal">66110734225681139</span></li></ul>}'
  );
});

test('big integer as number type gets rounded', () => {
  // javascript number type will display 66110734225681139 as 66110734225681140 due to lack of precision
  const data = {
    'big': 66110734225681139,
  };
  $('#json').jsonViewer(data);

  expect($('#json').html()).toEqual(
    '<a href="" class="json-toggle"></a>{<ul class="json-dict"><li>big: <span class="json-literal">66110734225681140</span></li></ul>}'
  );
});

test('copyToClipboard option is opt-in', () => {
  $('#json').jsonViewer({ 'hello': 'world' });

  expect($('#json a.json-copy').length).toEqual(0);
});

test('copyToClipboard renders copy buttons for nodes', () => {
  $('#json').jsonViewer({
    'value': 'hello',
    'nested': {
      'count': 2,
    },
    'items': [1, 2]
  }, { copyToClipboard: true });

  expect($('#json a.json-copy').length).toEqual(7);
  expect(getCopyButton(['nested', 'count']).length).toEqual(1);
  expect(getCopyButton(['items', 1]).length).toEqual(1);
  expect(getCopyButton([]).length).toEqual(1);
});

test('copyToClipboard copies strings without quotes', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  navigator.clipboard = { writeText };
  $('#json').jsonViewer({ 'hello': 'world' }, { copyToClipboard: true });

  getCopyButton(['hello']).click();
  await Promise.resolve();

  expect(writeText).toHaveBeenCalledWith('world');
});

test(
  'copyToClipboard copies numbers, booleans and null as literals',
  async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    navigator.clipboard = { writeText };
    $('#json').jsonViewer({
      'count': 3,
      'ready': true,
      'empty': null
    }, { copyToClipboard: true });

    getCopyButton(['count']).click();
    getCopyButton(['ready']).click();
    getCopyButton(['empty']).click();
    await Promise.resolve();

    expect(writeText).toHaveBeenNthCalledWith(1, '3');
    expect(writeText).toHaveBeenNthCalledWith(2, 'true');
    expect(writeText).toHaveBeenNthCalledWith(3, 'null');
  }
);

test('copyToClipboard copies arrays as inline json', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  navigator.clipboard = { writeText };
  $('#json').jsonViewer(
    { 'items': [1, 'two', false] },
    { copyToClipboard: true }
  );

  getCopyButton(['items']).click();
  await Promise.resolve();

  expect(writeText).toHaveBeenCalledWith('[1,"two",false]');
});

test('copyToClipboard copies objects as indented json', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  navigator.clipboard = { writeText };
  $('#json').jsonViewer({
    'nested': {
      'name': 'cake',
      'count': 2
    }
  }, { copyToClipboard: true });

  getCopyButton(['nested']).click();
  await Promise.resolve();

  expect(writeText).toHaveBeenCalledWith(
    '{\n  "name": "cake",\n  "count": 2\n}'
  );
});

test('copyToClipboard resolves keys with punctuation', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  navigator.clipboard = { writeText };
  $('#json').jsonViewer({
    'a.b[0]': {
      '"quoted"': 'value'
    }
  }, { copyToClipboard: true });

  getCopyButton(['a.b[0]', '"quoted"']).click();
  await Promise.resolve();

  expect(writeText).toHaveBeenCalledWith('value');
});

test(
  'copyToClipboard uses fallback when navigator.clipboard is unavailable',
  () => {
    document.execCommand = jest.fn().mockReturnValue(true);
    $('#json').jsonViewer({ 'hello': 'world' }, { copyToClipboard: true });

    getCopyButton(['hello']).click();

    expect(document.execCommand).toHaveBeenCalledWith('copy');
  }
);

test('copyToClipboard does not toggle collapsed nodes', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  navigator.clipboard = { writeText };
  $('#json').jsonViewer({
    'nested': {
      'count': 1
    }
  }, { copyToClipboard: true, collapsed: true });

  expect($('#json a.json-toggle').first().hasClass('collapsed')).toEqual(true);

  getCopyButton(['nested']).click();
  await Promise.resolve();

  expect($('#json a.json-toggle').first().hasClass('collapsed')).toEqual(true);
  expect(writeText).toHaveBeenCalledWith('{\n  "count": 1\n}');
});

test('copyToClipboard copies big number rendering when enabled', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  navigator.clipboard = { writeText };
  const data = {
    'big': {
      isLosslessNumber: true,
      toString: () => '66110734225681139'
    }
  };
  $('#json').jsonViewer(data, { copyToClipboard: true, bigNumbers: true });

  getCopyButton(['big']).click();
  await Promise.resolve();

  expect(writeText).toHaveBeenCalledWith('66110734225681139');
});
