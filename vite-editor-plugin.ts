import type { Plugin } from 'vite';
import { promises as fs } from 'fs';
import path from 'path';

interface SaveMapPayload {
  mapId: string;
  fileBase: string;
  fnName: string;
  label: string;
  code: string;
}

/**
 * Dev-only endpoint the level editor (?editor) calls to write a generated
 * scenario straight into src/story/maps and register it in config.ts /
 * storyMap.ts, so a map built in the editor is immediately playable from
 * the Сценарій menu without manual file surgery.
 */
export function editorSavePlugin(): Plugin {
  return {
    name: 'sloboda-editor-save',
    configureServer(server) {
      server.middlewares.use('/__editor/save-map', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          handleSave(server.config.root, body).then(
            (result) => {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            },
            (err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
            },
          );
        });
      });
    },
  };
}

async function handleSave(root: string, body: string) {
  const payload = JSON.parse(body) as SaveMapPayload;
  const { mapId, fileBase, fnName, label, code } = payload;

  if (!/^[a-z][a-z0-9-]*$/.test(mapId)) throw new Error(`Невалідний mapId: ${mapId}`);
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(fileBase)) throw new Error(`Невалідний fileBase: ${fileBase}`);
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(fnName)) throw new Error(`Невалідний fnName: ${fnName}`);

  const mapFile = path.join(root, 'src/story/maps', `${fileBase}.ts`);
  await fs.writeFile(mapFile, code, 'utf8');

  await patchConfig(path.join(root, 'src/config.ts'), mapId, label);
  await patchStoryMap(path.join(root, 'src/story/storyMap.ts'), mapId, fnName, fileBase);

  return { ok: true, mapFile: path.relative(root, mapFile) };
}

async function patchConfig(file: string, mapId: string, label: string): Promise<void> {
  let src = await fs.readFile(file, 'utf8');

  const typeRe = /export type StoryMapId = ([^;]+);/;
  const typeMatch = src.match(typeRe);
  if (!typeMatch) throw new Error('Не знайдено "export type StoryMapId" у config.ts');
  if (!typeMatch[1].includes(`'${mapId}'`)) {
    src = src.replace(typeRe, `export type StoryMapId = ${typeMatch[1]} | '${mapId}';`);
  }

  const labelRe = /export const STORY_MAP_LABEL: Record<StoryMapId, string> = \{([\s\S]*?)\};/;
  const labelMatch = src.match(labelRe);
  if (!labelMatch) throw new Error('Не знайдено "STORY_MAP_LABEL" у config.ts');
  if (!labelMatch[1].includes(`'${mapId}':`)) {
    const escapedLabel = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const newBody = `\n  '${mapId}': '${escapedLabel}',${labelMatch[1]}`;
    src = src.replace(labelRe, `export const STORY_MAP_LABEL: Record<StoryMapId, string> = {${newBody}};`);
  }

  await fs.writeFile(file, src, 'utf8');
}

async function patchStoryMap(file: string, mapId: string, fnName: string, fileBase: string): Promise<void> {
  let src = await fs.readFile(file, 'utf8');

  const importLine = `import { ${fnName} } from './maps/${fileBase}';`;
  if (!src.includes(importLine)) {
    const importRe = /^import .+;$/gm;
    let lastImportEnd = -1;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src))) lastImportEnd = m.index + m[0].length;
    if (lastImportEnd === -1) throw new Error('Не знайдено import у storyMap.ts');
    src = `${src.slice(0, lastImportEnd)}\n${importLine}${src.slice(lastImportEnd)}`;
  }

  const caseLine = `case '${mapId}':`;
  if (!src.includes(caseLine)) {
    const switchRe = /switch \(id\) \{([\s\S]*?)\n(\s*)\}\n\}/;
    const swMatch = src.match(switchRe);
    if (!swMatch) throw new Error('Не знайдено "switch (id)" у storyMap.ts');
    const indent = swMatch[2];
    const caseIndent = `${indent}  `;
    const returnIndent = `${caseIndent}  `;
    const newCase = `\n${caseIndent}case '${mapId}':\n${returnIndent}return ${fnName}(seed);`;
    src = src.replace(switchRe, `switch (id) {${swMatch[1]}${newCase}\n${indent}}\n}`);
  }

  await fs.writeFile(file, src, 'utf8');
}
