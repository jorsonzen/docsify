import axios from 'axios';
import fs from 'fs';
import path from 'path';

const filePaths = {
  emojiMarkdown: path.resolve(process.cwd(), 'docs', 'emoji.md'),
  emojiJS: path.resolve(
    process.cwd(),
    'src',
    'core',
    'render',
    'emoji-data.js'
  ),
};

async function getEmojiData() {
  const emojiDataURL = 'https://api.github.com/emojis';

  console.info(`- Fetching emoji data from ${emojiDataURL}`);

  const response = await axios.get(emojiDataURL);
  const baseURL = Object.values(response.data)
    .find(url => /unicode\//)
    .split('unicode/')[0];
  const data = { ...response.data };

  // Remove base URL from emoji URLs
  Object.entries(data).forEach(
    ([key, value]) => (data[key] = value.replace(baseURL, ''))
  );

  console.info(`- Retrieved ${Object.keys(data).length} emoji entries`);

  return {
    baseURL,
    data,
  };
}

function writeEmojiPage(emojiData) {
  const isExistingPage = fs.existsSync(filePaths.emojiMarkdown);
  const emojiPage =
    (isExistingPage && fs.readFileSync(filePaths.emojiMarkdown, 'utf8')) ||
    `<!-- START -->\n\n<!-- END -->`;
  const emojiRegEx = /(<!--\s*START.*-->\n)([\s\S]*)(\n<!--\s*END.*-->)/;
  const emojiMatch = emojiPage.match(emojiRegEx);
  const emojiMarkdownStart = emojiMatch[1].trim();
  const emojiMarkdown = emojiMatch[2].trim();
  const emojiMarkdownEnd = emojiMatch[3].trim();
  const newEmojiMarkdown = Object.keys(emojiData.data)
    .reduce(
      (preVal, curVal) =>
        (preVal += `:${curVal}: ` + '`' + `:${curVal}:` + '`' + '\n\n'),
      ''
    )
    .trim();

  if (emojiMarkdown !== newEmojiMarkdown) {
    const newEmojiPage = emojiPage.replace(
      emojiMatch[0],
      `${emojiMarkdownStart}\n\n${newEmojiMarkdown}\n\n${emojiMarkdownEnd}`
    );

    fs.writeFileSync(filePaths.emojiMarkdown, newEmojiPage);

    console.info(
      `- ${!isExistingPage ? 'Created' : 'Updated'}: ${filePaths.emojiMarkdown}`
    );
  } else {
    console.info(`- No changes: ${filePaths.emojiMarkdown}`);
  }
}

function writeEmojiJS(emojiData) {
  const isExistingPage = fs.existsSync(filePaths.emojiJS);
  const emojiJS = isExistingPage && fs.readFileSync(filePaths.emojiJS, 'utf8');
  const newEmojiJS = [
    '/* eslint-disable */\n',
    '// =============================================================================',
    '// DO NOT EDIT: This file is auto-generated by an /build/emoji.js',
    '// =============================================================================\n',
    `export default ${JSON.stringify(emojiData, {}, 2)}`,
  ].join('\n');

  if (!emojiJS || emojiJS !== newEmojiJS) {
    fs.writeFileSync(filePaths.emojiJS, newEmojiJS);

    console.info(
      `- ${!isExistingPage ? 'Created' : 'Updated'}: ${filePaths.emojiJS}`
    );
  } else {
    console.info(`- No changes: ${filePaths.emojiJS}`);
  }
}

console.info('Build emoji');

try {
  const emojiData = await getEmojiData();

  if (emojiData) {
    writeEmojiPage(emojiData);
    writeEmojiJS(emojiData);
  }
} catch (err) {
  console.warn(`- Error: ${err.message}`);
}
