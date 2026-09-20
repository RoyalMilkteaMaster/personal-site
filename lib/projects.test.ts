import assert from 'node:assert/strict';
import { localizedProjects, projects } from './projects.ts';

// 五件作品的 id 與順序是圖標、配色與舊首頁共用的依據，不隨文案改動。
assert.deepEqual(projects.map(p => p.id), ['market-council', 'cb', 'milktea', 'lol-highlights', 'xuerong-clawd']);

// 文案本身逐字不鎖（可整理標點與換行），這裡守的是「怎麼被排出來」的風險：
// 主預覽的卡片用 `white-space: pre-line` 照著作品自己的換行排，所以空行或
// 行首行尾的空白會在畫面上變成多出來的空白行／縮排。
for (const project of projects) {
  for (const [language, entry] of [['zh', project], ['en', project.en]] as const) {
    for (const field of ['summary', 'detail'] as const) {
      const text = (entry as { summary: string; detail: string })[field];
      assert.ok(text.trim(), `${project.id} ${language} ${field} 不得為空`);
      for (const line of text.split('\n'))
        assert.equal(line, line.trim(), `${project.id} ${language} ${field} 的換行帶了多餘空白：${JSON.stringify(line)}`);
      assert.equal(/\n\s*\n/.test(text), false, `${project.id} ${language} ${field} 不得有空行`);
    }
  }
  // 舊首頁只在 detail 與 summary 不同時才開 <details>，所以「沒有額外技術說明」
  // 的作品兩邊必須完全相同，否則首頁會多一個重複敘述的展開區。
  assert.equal(
    project.detail === project.summary,
    project.en.detail === project.en.summary,
    `${project.id} 中英必須同時有或同時沒有額外的 detail`,
  );
}

// 英文是同一筆資料的另一個語言，不是第二份清單。
const english = localizedProjects('en');
assert.equal(localizedProjects('zh'), projects, '中文直接用來源清單');
assert.deepEqual(english.map(p => p.id), projects.map(p => p.id));
english.forEach((p, i) => {
  assert.deepEqual(p.links, projects[i].links.map(({ labelEn, url }) => ({ label: labelEn, url })));
  assert.equal(/[一-鿿]/.test(p.title + p.summary + p.detail), false, `${p.id} 的英文欄位還留著中文`);
});

// 奶茶流顯示名稱是兩段（Spec R2）；英文那一段本身就是英文名。
assert.ok(projects[2].title.includes('奶茶流開發') && projects[2].title.includes('Milktea Skills'));

console.log('PASS: five ordered projects, one bilingual source, line breaks safe to render, no duplicate homepage details');
