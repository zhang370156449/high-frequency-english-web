import './styles.css';

const state = {
  data: null,
  route: 'home',
  currentPatternIndex: 0,
  currentExampleIndex: 0,
  listeningQueue: [],
  currentQuestionIndex: 0,
  selectedOption: null,
  answered: false,
  lastResult: null,
  sessionDone: 0,
  sessionCorrect: 0,
  vocabFilter: '',
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function currentPattern() {
  return state.data.patterns[state.currentPatternIndex] || state.data.patterns[0];
}

function currentExample() {
  const pattern = currentPattern();
  return pattern.examples[state.currentExampleIndex] || pattern.examples[0];
}

function setRoute(route) {
  state.route = route;
  state.selectedOption = null;
  state.answered = false;
  state.lastResult = null;
  document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function setPattern(index) {
  state.currentPatternIndex = Math.max(0, Math.min(state.data.patterns.length - 1, index));
  state.currentExampleIndex = 0;
  setRoute('pattern');
}

function playAudio(src, statusNode) {
  if (!src) {
    statusNode.textContent = '音频缺失';
    return;
  }
  const audio = new Audio(src);
  statusNode.textContent = '正在播放';
  audio.addEventListener('ended', () => {
    statusNode.textContent = '播放完成';
  });
  audio.addEventListener('error', () => {
    statusNode.textContent = '音频加载失败';
  });
  audio.play().catch(() => {
    statusNode.textContent = '请再次点击播放';
  });
}

function makeLayout(active, body) {
  const navItems = [
    ['home', '首页'],
    ['pattern', '句型学习'],
    ['listening', '听力训练'],
    ['vocab', '核心词库'],
  ];
  return el('div', { class: 'shell' }, [
    el('aside', { class: 'sidebar' }, [
      el('div', { class: 'brand' }, [
        el('strong', { text: '高频英语句子' }),
        el('span', { text: '公开课程版' }),
      ]),
      el('nav', {}, navItems.map(([route, label]) =>
        el('button', {
          class: `nav-item ${active === route ? 'active' : ''}`,
          text: label,
          onclick: () => setRoute(route),
        })
      )),
    ]),
    el('main', { class: 'content' }, [body]),
  ]);
}

function renderHome() {
  const pattern = currentPattern();
  const totalExamples = state.data.patterns.reduce((sum, item) => sum + item.examples.length, 0);
  return page('首页', [
    el('section', { class: 'hero card' }, [
      el('div', { class: 'hero-copy' }, [
        el('span', { class: 'eyebrow', text: '公开课程' }),
        el('h2', { text: pattern.title }),
        el('p', { class: 'muted', text: `${pattern.id}  ${pattern.meaning}` }),
        el('p', { class: 'translation', text: '打开就学，不记录账号、不保存学习进度。' }),
        el('button', { class: 'primary wide', text: '开始学习', onclick: () => setRoute('pattern') }),
      ]),
      el('div', { class: 'hero-panel' }, [
        statTile('课程数量', `${state.data.patterns.length} 课`),
        statTile('高频例句', `${totalExamples} 句`),
        statTile('核心词汇', `${state.data.vocabulary.length} 个`),
      ]),
    ]),
    card('课程目录', state.data.patterns.slice(0, 50).map((item, index) =>
      el('button', { class: 'course-row', onclick: () => setPattern(index) }, [
        el('strong', { text: item.id }),
        el('span', { text: item.title }),
        el('small', { text: item.meaning }),
      ])
    )),
  ]);
}

function renderPattern() {
  const pattern = currentPattern();
  const example = currentExample();
  const status = el('div', { class: 'audio-status', text: '当前播放：无' });
  return page('句型学习', [
    el('section', { class: 'card pattern-head' }, [
      el('span', { class: 'eyebrow', text: '核心句型' }),
      el('h2', { text: pattern.title }),
      el('p', { class: 'translation', text: pattern.meaning }),
      el('p', { class: 'muted', text: pattern.usage_note || '高频真实口语，适合日常直接套用。' }),
      el('div', { class: 'tag-row' }, abilityTags(pattern).map((tag) => el('span', { class: 'tag', text: tag }))),
      el('div', { class: 'meta-row' }, [
        el('span', { text: `课程 ${state.currentPatternIndex + 1}/${state.data.patterns.length}` }),
        el('span', { text: `例句 ${state.currentExampleIndex + 1}/${pattern.examples.length}` }),
      ]),
    ]),
    el('section', { class: 'card example-card' }, [
      el('span', { class: 'eyebrow', text: '自然表达' }),
      el('h3', { text: example.natural }),
      el('p', { class: 'translation', text: example.meaning_cn }),
      el('div', { class: 'button-row' }, [
        el('button', { class: 'secondary', text: '男声', onclick: () => playAudio(example.audio_male || example.audio_natural, status) }),
        el('button', { class: 'secondary', text: '女声', onclick: () => playAudio(example.audio_female || example.audio_challenge, status) }),
      ]),
      status,
      el('div', { class: 'hint-grid' }, [
        hintBlock('标准表达', example.standard),
        hintBlock('关键词', keywords(example).join(' / ') || '无'),
        hintBlock('口语提示', example.spoken_hint || '注意真实语速中的连读和弱读。'),
      ]),
      el('div', { class: 'button-row split' }, [
        el('button', { class: 'plain', text: '上一句', onclick: () => changeExample(-1) }),
        el('button', { class: 'primary', text: '下一句', onclick: () => changeExample(1) }),
      ]),
      el('button', { class: 'primary wide', text: '练本课听力', onclick: startPatternListening }),
    ]),
  ]);
}

function changeExample(delta) {
  const pattern = currentPattern();
  state.currentExampleIndex = Math.max(0, Math.min(pattern.examples.length - 1, state.currentExampleIndex + delta));
  render();
}

function startPatternListening() {
  buildListeningQueue(currentPattern().id);
  setRoute('listening');
}

function buildListeningQueue(patternId = null) {
  const examples = state.data.patterns
    .filter((pattern) => !patternId || pattern.id === patternId)
    .flatMap((pattern) => pattern.examples.map((example) => ({ ...example, patternId: pattern.id, patternTitle: pattern.title })));
  state.listeningQueue = shuffle(examples).slice(0, patternId ? 8 : 20);
  state.currentQuestionIndex = 0;
  state.selectedOption = null;
  state.answered = false;
  state.lastResult = null;
}

function renderListening() {
  if (!state.listeningQueue.length) buildListeningQueue();
  const question = state.listeningQueue[state.currentQuestionIndex] || state.listeningQueue[0];
  const status = el('div', { class: 'audio-status', text: '当前播放：无' });
  const options = question.options || makeOptions(question);
  question.options = options;
  const accuracy = state.sessionDone ? Math.round((state.sessionCorrect / state.sessionDone) * 100) : 0;
  return page('听力训练', [
    el('section', { class: 'card' }, [
      el('p', { class: 'muted', text: '先听真实口语，再选择你听到的中文意思。本页只记录本次练习表现，刷新后清空。' }),
      el('div', { class: 'stats-row' }, [
        statTile('本次正确率', `${accuracy}%`),
        statTile('本次已完成', `${state.sessionDone} 题`),
        statTile('当前题组', `${state.listeningQueue.length} 题`),
      ]),
      el('div', { class: 'meta-row' }, [
        el('span', { text: `第 ${state.currentQuestionIndex + 1} 题` }),
        el('span', { text: `剩余 ${Math.max(0, state.listeningQueue.length - state.currentQuestionIndex - 1)} 题` }),
      ]),
      progressBar(Math.round(((state.currentQuestionIndex + 1) / state.listeningQueue.length) * 100)),
      el('button', { class: 'primary play', text: '播放音频', onclick: () => playAudio(question.audio_male || question.audio_natural, status) }),
      status,
      el('div', { class: 'options' }, options.map((option) =>
        el('button', {
          class: `option ${state.selectedOption === option ? 'selected' : ''}`,
          text: option,
          onclick: () => {
            if (!state.answered) {
              state.selectedOption = option;
              render();
            }
          },
        })
      )),
      el('div', { class: 'button-row split' }, [
        el('button', { class: 'primary', text: '提交答案', onclick: submitAnswer }),
        el('button', { class: 'secondary', text: '下一句', onclick: nextQuestion }),
      ]),
      renderFeedback(question),
    ]),
  ]);
}

function submitAnswer() {
  if (state.answered || !state.selectedOption) return;
  const question = state.listeningQueue[state.currentQuestionIndex];
  const correct = state.selectedOption === question.meaning_cn;
  state.answered = true;
  state.lastResult = { correct, question, answer: state.selectedOption };
  state.sessionDone += 1;
  if (correct) state.sessionCorrect += 1;
  render();
}

function nextQuestion() {
  if (state.currentQuestionIndex < state.listeningQueue.length - 1) {
    state.currentQuestionIndex += 1;
  } else {
    buildListeningQueue();
  }
  state.selectedOption = null;
  state.answered = false;
  state.lastResult = null;
  render();
}

function renderFeedback(question) {
  if (!state.answered || !state.lastResult) return el('div', { class: 'feedback empty', text: '结果反馈会显示在这里。' });
  const result = state.lastResult;
  return el('div', { class: `feedback ${result.correct ? 'ok' : 'bad'}` }, [
    el('strong', { text: result.correct ? '回答正确' : '回答错误' }),
    !result.correct ? el('p', { text: `你的答案：${result.answer}` }) : el('span'),
    el('p', { text: `正确答案：${question.meaning_cn}` }),
    el('p', { text: `英文原句：${question.natural}` }),
    el('p', { text: `关键词：${keywords(question).join(' / ') || '无'}` }),
  ]);
}

function renderVocab() {
  const filter = state.vocabFilter || '';
  const words = state.data.vocabulary.filter((item) => {
    const haystack = `${item.word} ${item.meaning_cn} ${item.category}`.toLowerCase();
    return haystack.includes(filter.toLowerCase());
  });
  return page('核心词库', [
    el('section', { class: 'card' }, [
      el('input', {
        class: 'search',
        placeholder: '搜索英文或中文',
        value: filter,
        oninput: (event) => {
          state.vocabFilter = event.target.value;
          render();
        },
      }),
      el('div', { class: 'vocab-list' }, words.slice(0, 160).map((item) => vocabCard(item))),
    ]),
  ]);
}

function vocabCard(item) {
  const status = el('span', { class: 'audio-status small', text: item.ipa || '' });
  return el('div', { class: 'vocab-card' }, [
    el('div', {}, [
      el('strong', { text: item.word }),
      el('p', { class: 'muted', text: item.meaning_cn || item.meaning || '' }),
    ]),
    el('div', { class: 'vocab-actions' }, [
      el('button', { class: 'plain compact', text: '播放发音', onclick: () => playAudio(item.audio || item.audio_natural, status) }),
      status,
      el('span', { class: 'tag', text: categoryName(item.category) }),
    ]),
  ]);
}

function page(title, sections) {
  return makeLayout(state.route, el('div', { class: 'page' }, [
    el('h1', { text: title }),
    ...sections,
  ]));
}

function card(title, children) {
  return el('section', { class: 'card' }, [
    el('h2', { text: title }),
    ...children,
  ]);
}

function statTile(label, value) {
  return el('div', { class: 'stat' }, [
    el('span', { text: label }),
    el('strong', { text: value }),
  ]);
}

function progressBar(value) {
  return el('div', { class: 'progress' }, [el('i', { style: `width:${Math.max(0, Math.min(100, value))}%` })]);
}

function hintBlock(title, text) {
  return el('div', { class: 'hint' }, [
    el('span', { text: title }),
    el('p', { text }),
  ]);
}

function makeOptions(question) {
  const samePattern = state.data.patterns.find((pattern) => pattern.id === question.patternId)?.examples || [];
  const pool = samePattern
    .filter((item) => item.id !== question.id)
    .map((item) => item.meaning_cn)
    .filter(Boolean);
  const global = state.data.patterns.flatMap((pattern) => pattern.examples.map((item) => item.meaning_cn)).filter(Boolean);
  const options = [question.meaning_cn];
  for (const item of shuffle([...pool, ...global])) {
    if (!options.includes(item)) options.push(item);
    if (options.length === 3) break;
  }
  return shuffle(options);
}

function keywords(item) {
  return item.keywords || item.vocabulary_words || [];
}

function abilityTags(pattern) {
  return pattern.abilities || pattern.scenes || ['日常高频'];
}

function categoryName(category) {
  const map = {
    listening: '听懂确认',
    response: '自然回应',
    social: '社交聊天',
    daily: '日常生活',
    work: '职场协作',
    shopping: '购物服务',
    travel: '旅行应用',
    direction: '问路出行',
  };
  return map[category] || category || '高频';
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function render() {
  const root = document.querySelector('#app');
  root.innerHTML = '';
  if (!state.data) {
    root.append(el('div', { class: 'loading', text: '正在加载课程...' }));
    return;
  }
  const routes = {
    home: renderHome,
    pattern: renderPattern,
    listening: renderListening,
    vocab: renderVocab,
  };
  root.append((routes[state.route] || renderHome)());
}

async function boot() {
  render();
  const response = await fetch('/data/course_pack_web.json');
  state.data = await response.json();
  buildListeningQueue();
  render();
}

boot().catch((error) => {
  document.querySelector('#app').innerHTML = `<div class="loading">课程加载失败：${error.message}</div>`;
});
