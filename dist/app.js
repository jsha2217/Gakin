import { buildExifSegment, injectExif, parseExifDate } from './exif.js';

(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const els = {
    fileInput: $('#fileInput'), cameraInput: $('#cameraInput'), selectBtn: $('#selectBtn'), cameraBtn: $('#cameraBtn'),
    replaceBtn: $('#replaceBtn'), dropZone: $('#dropZone'), emptyState: $('#emptyState'), photoPreview: $('#photoPreview'),
    stamp: $('#stampOverlay'), dragTip: $('#dragTip'), fileStrip: $('#fileStrip'), fileName: $('#fileName'), fileMeta: $('#fileMeta'),
    exportBtn: $('#exportBtn'), date: $('#dateInput'), time: $('#timeInput'), dateDisplay: $('#dateDisplay'), timeDisplay: $('#timeDisplay'), custom: $('#customBtn'), original: $('#originalBtn'), timeSourceNote: $('#timeSourceNote'),
    label: $('#labelInput'), dateFormat: $('#dateFormat'), timezone: $('#timezone'), size: $('#sizeInput'), sizeOutput: $('#sizeOutput'),
    stylePicker: $('#stylePicker'), outputFormat: $('#outputFormat'), quality: $('#quality'), formatNote: $('#formatNote'),
    languageMenu: $('#languageMenu'), languageCurrent: $('#languageCurrent'), languageButtons: $$('.language-option'), languageReset: $('#languageReset'), themeMenu: $('#themeMenu'), themeCurrent: $('#themeCurrent'), themeButtons: $$('.theme-option'), themeReset: $('#themeReset'), resultDialog: $('#resultDialog'), resultImage: $('#resultImage'),
    resultDate: $('#resultDate'), resultFile: $('#resultFile'), resultExif: $('#resultExif'), shareBtn: $('#shareBtn'),
    downloadBtn: $('#downloadBtn'), processing: $('#processing'), toast: $('#toast')
  };

  const state = {
    file: null, renderBlob: null, sourceUrl: '', resultUrl: '', resultBlob: null, resultName: '',
    width: 0, height: 0, style: 'classic', x: .78, y: .82,
    customDate: '', customTime: '', originalDate: null, originalSource: '', language: 'en', languageChoice: 'system', themeChoice: 'system', resultMetadataStatus: ''
  };

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const translations = {
    ko: {
      pageTitle: 'Gakin — 사진 타임스탬프', metaDescription: '사진은 기기 안에서만 처리하고, 보이는 타임스탬프와 촬영 시간을 함께 바꾸는 모바일 사진 도구입니다.',
      brandHome: 'Gakin 홈', brandName: 'Gakin', languageLabel: '언어 선택', languageMenuText: '언어', languageAuto: '기기 언어 따르기', themeLabel: '테마', themeAuto: '기기 테마 따르기', themeLight: '라이트', themeDark: '다크', editorLabel: '사진 편집기', heroTitle: '사진에 시간 각인', heroDescription: '사진에 시간을 새기고, 원하는 모습 그대로 저장하세요.', onDevice: '사진은 기기에서 처리', previewTitle: '작업 미리보기', previewLive: '실시간',
      choosePhoto: '사진을 선택하세요', selectPhoto: '사진 선택', useCamera: '카메라로 촬영', photoPreviewAlt: '선택한 사진 미리보기', stampPositionLabel: '타임스탬프 위치. 끌거나 방향키로 이동할 수 있습니다', dragTip: '끌어서 위치 이동', replacePhoto: '다른 사진',
      timeSection: '시간', dateLabel: '날짜', timeLabel: '시간', customTime: '사용자 지정', originalTime: '원본 촬영 시간', designSection: '디자인', designGroupLabel: '타임스탬프 디자인', styleClassic: '클래식', styleMinimal: '미니멀', styleFilm: '필름', stylePostcard: '포스트카드', styleDigital: '디지털', styleDigitalClear: '디지털 · 투명', styleStory: '스토리 손글씨', styleVhs: 'VHS', styleTape: '종이 테이프',
      detailsSection: '세부 설정', captionLabel: '짧은 문구', captionPlaceholder: '예: 성수동, 서울', displayFormat: '표시 형식', timezoneLabel: '시간대', tzSeoul: '서울 · UTC+9', tzNewYork: '뉴욕 · UTC-5', tzParis: '파리 · UTC+1', tzSingapore: '싱가포르 · UTC+8', sizeLabel: '크기',
      fileSection: '파일', saveFormat: '저장 형식', jpgOption: 'JPG · 촬영시간 포함', pngOption: 'PNG · 무손실', webpOption: 'WEBP · 작은 용량', qualityLabel: '화질', qualityBest: '최고 화질', qualityBalanced: '균형', qualitySmall: '작은 용량', exifNote: '지정한 촬영시간과 시간대가 JPG 파일에 기록됩니다.', noteLabel: '안내', nonJpegNote: 'PNG와 WEBP는 사진 앱의 촬영시간 인식이 제한될 수 있습니다.',
      makePhoto: '타임스탬프 사진 만들기', originalUnchanged: '원본 사진은 변경되지 않습니다.', closeLabel: '닫기', resultTitle: '새 사진을 만들었어요.', resultDescription: '원본은 그대로 두고, 타임스탬프가 들어간 복사본을 준비했습니다.', resultPreviewAlt: '완성된 사진 미리보기', captureTime: '촬영 시간', metadataLabel: '메타데이터', sharePhoto: '사진 앱으로 공유', saveFile: '파일로 저장', processingTitle: '사진에 시간을 새기는 중', processingDescription: '창을 닫지 말아주세요.',
      invalidImage: '이미지 파일을 선택해주세요.', loadingHeic: 'HEIC 사진을 여는 중', loadingPhoto: '사진을 여는 중', heicModuleError: 'HEIC 변환 모듈을 불러오지 못했습니다.', originalFallbackFile: '촬영시간 정보가 없어 파일 시간을 대신 사용합니다.', originalFallbackNow: '촬영시간 정보가 없어 현재 시각을 대신 사용합니다.', heicReadySuffix: ' → JPG 변환 준비', heicLoaded: 'HEIC 사진을 안전하게 열었습니다.', photoLoaded: '사진을 불러왔습니다.', imageReadError: '이 사진을 읽지 못했어요.', canvasError: '사진 파일을 만들지 못했습니다.', enterDateTime: '날짜와 시간을 입력해주세요.', exifVerified: '촬영시간 기록 확인됨', exifLimited: '선택한 형식은 촬영시간 호환이 제한됨', hugeResize: '기기 안정성을 위해 매우 큰 사진의 크기를 조정했어요.', createError: '사진을 만드는 중 문제가 생겼어요.', downloadStarted: '파일 저장을 시작했습니다.', shareTitle: 'Gakin으로 만든 타임스탬프 사진', shareFallback: '공유 대신 파일로 저장했습니다.'
    },
    en: {
      pageTitle: 'Gakin — Photo Timestamp', metaDescription: 'Add a visible timestamp and update the capture time of your photo, entirely on your device.',
      brandHome: 'Gakin home', brandName: 'Gakin', languageLabel: 'Choose language', languageMenuText: 'Language', languageAuto: 'Follow device language', themeLabel: 'Theme', themeAuto: 'Follow device theme', themeLight: 'Light', themeDark: 'Dark', editorLabel: 'Photo editor', heroTitle: 'Stamp time on a photo', heroDescription: 'Stamp the time and save your photo just as you see it.', onDevice: 'Processed on this device', previewTitle: 'Live preview', previewLive: 'LIVE',
      choosePhoto: 'Choose a photo', selectPhoto: 'Select photo', useCamera: 'Take a photo', photoPreviewAlt: 'Selected photo preview', stampPositionLabel: 'Timestamp position. Drag it or use the arrow keys to move it.', dragTip: 'Drag to reposition', replacePhoto: 'Choose another',
      timeSection: 'Time', dateLabel: 'Date', timeLabel: 'Time', customTime: 'Custom', originalTime: 'Original capture time', designSection: 'Design', designGroupLabel: 'Timestamp design', styleClassic: 'Classic', styleMinimal: 'Minimal', styleFilm: 'Film', stylePostcard: 'Postcard', styleDigital: 'Digital', styleDigitalClear: 'Digital · Clear', styleStory: 'Story Script', styleVhs: 'VHS', styleTape: 'Paper tape',
      detailsSection: 'Details', captionLabel: 'Short caption', captionPlaceholder: 'e.g. Seongsu, Seoul', displayFormat: 'Display format', timezoneLabel: 'Time zone', tzSeoul: 'Seoul · UTC+9', tzNewYork: 'New York · UTC-5', tzParis: 'Paris · UTC+1', tzSingapore: 'Singapore · UTC+8', sizeLabel: 'Size',
      fileSection: 'File', saveFormat: 'Save format', jpgOption: 'JPG · includes capture time', pngOption: 'PNG · lossless', webpOption: 'WEBP · smaller file', qualityLabel: 'Quality', qualityBest: 'Best quality', qualityBalanced: 'Balanced', qualitySmall: 'Smaller file', exifNote: 'The chosen capture time and time zone are written to the JPG file.', noteLabel: 'NOTE', nonJpegNote: 'Photo apps may have limited capture-time support for PNG and WEBP.',
      makePhoto: 'Create timestamped photo', originalUnchanged: 'Your original photo stays unchanged.', closeLabel: 'Close', resultTitle: 'Your new photo is ready.', resultDescription: 'We made a timestamped copy and kept the original unchanged.', resultPreviewAlt: 'Finished photo preview', captureTime: 'Capture time', metadataLabel: 'Metadata', sharePhoto: 'Share to Photos', saveFile: 'Save file', processingTitle: 'Stamping the time', processingDescription: 'Please keep this window open.',
      invalidImage: 'Please choose an image file.', loadingHeic: 'Opening HEIC photo', loadingPhoto: 'Opening photo', heicModuleError: 'The HEIC converter could not be loaded.', originalFallbackFile: 'No capture time was found, so the file time is being used.', originalFallbackNow: 'No capture time was found, so the current time is being used.', heicReadySuffix: ' → ready to convert to JPG', heicLoaded: 'HEIC photo opened safely.', photoLoaded: 'Photo loaded.', imageReadError: 'This photo could not be read.', canvasError: 'The photo file could not be created.', enterDateTime: 'Please enter a date and time.', exifVerified: 'Capture time verified', exifLimited: 'Capture-time support is limited for this format', hugeResize: 'This very large photo was resized for device stability.', createError: 'Something went wrong while creating the photo.', downloadStarted: 'Your download has started.', shareTitle: 'Timestamped photo made with Gakin', shareFallback: 'Sharing was unavailable, so the file was saved instead.'
    }
  };

  function t(key) {
    return translations[state.language]?.[key] || translations.en[key] || key;
  }

  function systemLanguage() {
    const code = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase().replace('_', '-').split('-')[0];
    return Object.hasOwn(translations, code) ? code : 'en';
  }

  function updateThemeLabel() {
    els.themeCurrent.textContent = t(document.documentElement.dataset.theme === 'dark' ? 'themeDark' : 'themeLight');
  }

  function applyTheme(choice, persist = false) {
    state.themeChoice = ['system', 'light', 'dark'].includes(choice) ? choice : 'system';
    const resolved = state.themeChoice === 'system' ? (systemTheme.matches ? 'dark' : 'light') : state.themeChoice;
    document.documentElement.dataset.theme = resolved;
    updateThemeLabel();
    $('meta[name="theme-color"]').content = resolved === 'dark' ? '#0c0d0c' : '#f1efe9';
    els.themeButtons.forEach((button) => {
      const active = button.dataset.themeChoice === resolved;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    els.themeReset.hidden = state.themeChoice === 'system';
    if (persist) { try { localStorage.setItem('gakin-theme', state.themeChoice); } catch {} }
  }

  function updateFormatNote() {
    const isJpeg = els.outputFormat.value === 'image/jpeg';
    els.quality.disabled = els.outputFormat.value === 'image/png';
    els.formatNote.innerHTML = isJpeg ? `<span>EXIF</span><b>${t('exifNote')}</b>` : `<span>${t('noteLabel')}</span><b>${t('nonJpegNote')}</b>`;
  }

  function updateTimeSourceNote() {
    if (!state.file || state.originalSource === 'metadata') {
      els.timeSourceNote.hidden = true;
      els.timeSourceNote.textContent = '';
      return;
    }
    els.timeSourceNote.hidden = false;
    els.timeSourceNote.textContent = t(state.originalSource === 'file' ? 'originalFallbackFile' : 'originalFallbackNow');
  }

  function applyLanguage(choice, persist = false) {
    state.languageChoice = ['system', 'ko', 'en'].includes(choice) ? choice : 'system';
    state.language = state.languageChoice === 'system' ? systemLanguage() : state.languageChoice;
    els.languageCurrent.textContent = state.language === 'ko' ? '한국어' : 'English';
    document.documentElement.lang = state.language;
    document.title = t('pageTitle');
    $('meta[name="description"]').content = t('metaDescription');
    $$('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    $$('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
    $$('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
    $$('[data-i18n-alt]').forEach((element) => { element.alt = t(element.dataset.i18nAlt); });
    updateThemeLabel();
    els.languageButtons.forEach((button) => {
      const active = button.dataset.language === state.language;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    els.languageReset.hidden = state.languageChoice === 'system';
    updateFormatNote();
    updateTimeSourceNote();
    if (state.resultMetadataStatus) els.resultExif.textContent = t(state.resultMetadataStatus);
    if (persist) { try { localStorage.setItem('gakin-language-choice', state.languageChoice); } catch {} }
  }

  function localParts(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
    return { date: local.slice(0, 10), time: local.slice(11, 19) };
  }

  function setCustomToNow() {
    const current = localParts();
    state.customDate = current.date;
    state.customTime = current.time;
    els.date.value = state.customDate;
    els.time.value = state.customTime;
    setQuickChoice('custom');
    updateStamp();
  }

  function setQuickChoice(kind) {
    els.custom.classList.toggle('active', kind === 'custom');
    els.original.classList.toggle('active', kind === 'original');
  }

  function formatDate(value, mode) {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (mode === 'dash') return `${year}-${month}-${day}`;
    if (mode === 'film') return `'${year.slice(2)} ${month} ${day}`;
    if (mode === 'eng') return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
    return `${year}. ${month}. ${day}`;
  }

  function exifDateTime() {
    return `${els.date.value.replaceAll('-', ':')} ${els.time.value.padEnd(8, ':00').slice(0, 8)}`;
  }

  function updateStamp() {
    els.dateDisplay.textContent = els.date.value ? formatDate(els.date.value, 'dot') : '—';
    els.timeDisplay.textContent = els.time.value || '—';
    els.sizeOutput.textContent = `${els.size.value}%`;
    positionOverlay();
    renderStyleSamples();
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2500);
  }

  function isHeic(file) {
    return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  }

  function humanBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function getImageRect() {
    const stage = els.dropZone;
    if (!state.width || !state.height) return { left: 0, top: 0, width: stage.clientWidth, height: stage.clientHeight };
    const imageRatio = state.width / state.height;
    const stageRatio = stage.clientWidth / stage.clientHeight;
    if (imageRatio > stageRatio) {
      const height = stage.clientWidth / imageRatio;
      return { left: 0, top: (stage.clientHeight - height) / 2, width: stage.clientWidth, height };
    }
    const width = stage.clientHeight * imageRatio;
    return { left: (stage.clientWidth - width) / 2, top: 0, width, height: stage.clientHeight };
  }

  function positionOverlay() {
    if (!state.file) return;
    const rect = getImageRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    const canvasWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const canvasHeight = Math.max(1, Math.round(rect.height * pixelRatio));
    els.stamp.style.left = `${rect.left}px`;
    els.stamp.style.top = `${rect.top}px`;
    els.stamp.style.width = `${rect.width}px`;
    els.stamp.style.height = `${rect.height}px`;
    if (els.stamp.width !== canvasWidth) els.stamp.width = canvasWidth;
    if (els.stamp.height !== canvasHeight) els.stamp.height = canvasHeight;
    const ctx = els.stamp.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    ctx.setTransform(canvasWidth / rect.width, 0, 0, canvasHeight / rect.height, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.drawImage(els.photoPreview, 0, 0, rect.width, rect.height);
    drawStamp(ctx, rect.width, rect.height);
  }

  async function loadFile(file) {
    if (!file || (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name))) {
      toast(t('invalidImage'));
      return;
    }
    els.processing.hidden = false;
    els.processing.querySelector('strong').textContent = t(isHeic(file) ? 'loadingHeic' : 'loadingPhoto');
    const keepOriginalSelected = els.original.classList.contains('active');
    try {
      state.file = file;
      state.originalDate = null;
      state.originalSource = '';
      if (/jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name)) {
        state.originalDate = parseExifDate(await file.arrayBuffer());
        if (state.originalDate) state.originalSource = 'metadata';
      }
      if (!state.originalDate) {
        const hasFileTime = Number.isFinite(file.lastModified) && file.lastModified > 0;
        const fallback = localParts(new Date(hasFileTime ? file.lastModified : Date.now()));
        state.originalDate = `${fallback.date.replaceAll('-', ':')} ${fallback.time}`;
        state.originalSource = hasFileTime ? 'file' : 'now';
      }
      let renderBlob = file;
      if (isHeic(file)) {
        if (typeof window.heic2any !== 'function') throw new Error(t('heicModuleError'));
        const converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: .96 });
        renderBlob = Array.isArray(converted) ? converted[0] : converted;
      }
      state.renderBlob = renderBlob;
      if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
      state.sourceUrl = URL.createObjectURL(renderBlob);
      els.photoPreview.src = state.sourceUrl;
      await els.photoPreview.decode();
      state.width = els.photoPreview.naturalWidth;
      state.height = els.photoPreview.naturalHeight;
      els.fileName.textContent = file.name;
      const ext = (file.name.split('.').pop() || file.type.split('/').pop() || 'IMAGE').toUpperCase();
      els.fileMeta.textContent = `${state.width} × ${state.height} · ${ext}${isHeic(file) ? t('heicReadySuffix') : ''}`;
      els.emptyState.hidden = true;
      els.stamp.style.display = 'block';
      els.dragTip.style.display = 'block';
      els.fileStrip.hidden = false;
      els.exportBtn.disabled = false;
      els.original.disabled = false;
      updateTimeSourceNote();
      if (keepOriginalSelected) chooseOriginal();
      requestAnimationFrame(positionOverlay);
      setTimeout(() => { els.dragTip.style.display = 'none'; }, 2800);
      toast(t(isHeic(file) ? 'heicLoaded' : 'photoLoaded'));
    } catch (error) {
      console.error(error);
      state.file = null;
      toast(error.message || t('imageReadError'));
    } finally {
      els.processing.hidden = true;
      els.processing.querySelector('strong').textContent = t('processingTitle');
    }
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawLedGlyph(ctx, glyph, x, y, size, activeColor = '#ff6a42', inactiveColor = 'rgba(255,105,67,.13)') {
    const segments = {
      '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
      '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd'
    };
    if (glyph === ':') {
      ctx.fillStyle = activeColor;
      ctx.shadowBlur = size * .18;
      ctx.beginPath();
      ctx.arc(x + size * .14, y + size * .39, size * .055, 0, Math.PI * 2);
      ctx.arc(x + size * .14, y + size * .77, size * .055, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return size * .28;
    }
    const lines = {
      a: [.15, .08, .51, .08], b: [.59, .16, .59, .50], c: [.59, .65, .59, .99],
      d: [.15, 1.07, .51, 1.07], e: [.07, .65, .07, .99], f: [.07, .16, .07, .50],
      g: [.15, .575, .51, .575]
    };
    const active = segments[glyph] || '';
    ctx.lineCap = 'round';
    ctx.lineWidth = size * .085;
    for (const [name, line] of Object.entries(lines)) {
      if (!active.includes(name) && !inactiveColor) continue;
      ctx.beginPath();
      ctx.moveTo(x + line[0] * size, y + line[1] * size);
      ctx.lineTo(x + line[2] * size, y + line[3] * size);
      ctx.strokeStyle = active.includes(name) ? activeColor : inactiveColor;
      ctx.shadowBlur = active.includes(name) ? size * .18 : 0;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    return size * .66;
  }

  function drawStamp(ctx, width, height, options = {}) {
    const size = options.size ?? width * Number(els.size.value) / 100;
    const showSeconds = els.dateFormat.value === 'dash-seconds';
    const date = options.date ?? formatDate(els.date.value, showSeconds ? 'dash' : els.dateFormat.value);
    const rawTime = els.time.value || '00:00:00';
    const time = options.time ?? (showSeconds ? (rawTime.length === 5 ? `${rawTime}:00` : rawTime).slice(0, 8) : rawTime.slice(0, 5));
    const label = options.label ?? els.label.value.trim();
    const style = options.style ?? state.style;
    const x = width * (options.x ?? state.x);
    const y = height * (options.y ?? state.y);
    const mono = '"Courier New", ui-monospace, monospace';
    const clean = 'Arial, sans-serif';
    const textWidth = (value, font) => { ctx.font = font; return ctx.measureText(value).width; };
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';

    if (style === 'minimal') {
      const timeFont = `300 ${size * 1.12}px ${clean}`;
      const dateFont = `700 ${size * .24}px ${clean}`;
      const labelFont = `500 ${size * .23}px ${clean}`;
      const w = Math.max(textWidth(time, timeFont), textWidth(date, dateFont), label ? textWidth(label, labelFont) : 0);
      const right = x + w / 2;
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = size * .2;
      ctx.fillStyle = '#fffefa'; ctx.font = dateFont; ctx.fillText(date, right, y - size * .61);
      ctx.font = timeFont; ctx.fillText(time, right, y + size * .02);
      ctx.shadowColor = 'transparent'; ctx.fillStyle = 'rgba(255,255,255,.9)';
      if (label) { ctx.font = labelFont; ctx.fillText(label, right, y + size * .93); }
    } else if (style === 'cctv') {
      const top = (label || 'CAM 01').toUpperCase();
      const bottom = `${date}  ${time}`;
      const topFont = `700 ${size * .24}px ${mono}`;
      const bottomFont = `700 ${size * .43}px ${mono}`;
      const w = Math.max(textWidth(bottom, bottomFont) + size * .72, textWidth(top, topFont) + size * 1.36, size * 3.1);
      const h = size * 1.48, left = x - w / 2, topY = y - h / 2;
      roundedRect(ctx, left, topY, w, h, size * .09);
      ctx.fillStyle = 'rgba(7,15,13,.82)'; ctx.fill();
      ctx.strokeStyle = 'rgba(236,248,240,.72)'; ctx.lineWidth = size * .025; ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = '#f4f8f4'; ctx.font = topFont;
      ctx.fillText(top, left + size * .22, y - size * .4, w - size * 1.12);
      ctx.fillStyle = '#f25c4e'; ctx.beginPath(); ctx.arc(left + w - size * .77, y - size * .4, size * .075, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'right'; ctx.font = topFont; ctx.fillText('REC', left + w - size * .2, y - size * .4);
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = size * .014;
      ctx.beginPath(); ctx.moveTo(left + size * .2, y - size * .12); ctx.lineTo(left + w - size * .2, y - size * .12); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = bottomFont; ctx.fillText(bottom, x, y + size * .32, w - size * .36);
    } else if (style === 'lcd') {
      const timeFont = `700 ${size * 1.08}px ${mono}`;
      const dateFont = `700 ${size * .26}px ${mono}`;
      const labelFont = `700 ${size * .2}px ${mono}`;
      const w = Math.max(textWidth(time, timeFont), textWidth(date, dateFont), label ? textWidth(label, labelFont) : 0) + size * .88;
      const h = size * (label ? 2.18 : 1.9);
      roundedRect(ctx, x - w / 2, y - h / 2, w, h, size * .2);
      ctx.fillStyle = 'rgba(8,27,16,.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(176,245,118,.55)'; ctx.lineWidth = size * .025; ctx.stroke();
      ctx.fillStyle = 'rgba(183,255,118,.38)';
      ctx.fillRect(x - w / 2 + size * .2, y - h / 2 + size * .18, size * .32, size * .05);
      ctx.shadowColor = 'rgba(184,255,113,.54)'; ctx.shadowBlur = size * .18;
      ctx.fillStyle = '#d4ff8b'; ctx.font = timeFont; ctx.fillText(time, x, y - size * .2);
      ctx.shadowBlur = 0; ctx.fillStyle = '#adcf86'; ctx.font = dateFont; ctx.fillText(date, x, y + size * .52);
      if (label) { ctx.font = labelFont; ctx.fillText(label.toUpperCase(), x, y + size * .82); }
    } else if (style === 'digital' || style === 'digital-clear') {
      const clear = style === 'digital-clear';
      const dateFont = `700 ${size * .29}px ${mono}`;
      const labelFont = `600 ${size * .22}px ${mono}`;
      const ledWidth = [...time].reduce((sum, glyph) => sum + size * (glyph === ':' ? .28 : .66), 0) + size * .075 * Math.max(0, time.length - 1);
      const w = Math.max(ledWidth + size * .65, textWidth(date, dateFont) + size * .72, label ? textWidth(label, labelFont) + size * .72 : 0);
      const h = size * (label ? 2.38 : 2.02);
      if (!clear) {
        roundedRect(ctx, x - w / 2, y - h / 2, w, h, size * .22);
        ctx.fillStyle = 'rgba(18,15,16,.91)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,135,102,.38)'; ctx.lineWidth = size * .025; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.045)';
        roundedRect(ctx, x - w / 2 + size * .12, y - h / 2 + size * .12, w - size * .24, size * .12, size * .04); ctx.fill();
      }
      ctx.shadowColor = clear ? 'rgba(0,0,0,.85)' : 'rgba(255,75,43,.75)';
      ctx.fillStyle = clear ? '#ffffff' : '#ff6a42';
      let digitX = x - ledWidth / 2;
      for (const glyph of time) digitX += drawLedGlyph(ctx, glyph, digitX, y - size * .78, size, clear ? '#ffffff' : '#ff6a42', clear ? null : 'rgba(255,105,67,.13)') + size * .075;
      ctx.shadowBlur = clear ? size * .12 : 0;
      ctx.fillStyle = clear ? '#ffffff' : '#ffa286'; ctx.font = dateFont; ctx.fillText(date, x, y + size * .67);
      if (label) { ctx.fillStyle = clear ? '#ffffff' : '#d9a59a'; ctx.font = labelFont; ctx.fillText(label.toUpperCase(), x, y + size * 1.03); }
    } else if (style === 'story') {
      const script = '"Snell Roundhand", "Brush Script MT", "Segoe Script", "Apple Chancery", cursive';
      const timeFont = `italic 500 ${size * 1.16}px ${script}`;
      const dateFont = `italic 500 ${size * .56}px ${script}`;
      const labelFont = `italic 500 ${size * .28}px Georgia, serif`;
      const w = Math.max(textWidth(time, timeFont), textWidth(date, dateFont), label ? textWidth(label, labelFont) : 0) + size * .62;
      ctx.shadowColor = 'rgba(20,15,19,.82)'; ctx.shadowBlur = size * .17; ctx.shadowOffsetY = size * .045;
      ctx.fillStyle = '#fff8f2'; ctx.font = timeFont; ctx.fillText(time, x, y - size * .2);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,227,214,.94)'; ctx.lineWidth = size * .035; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - w * .29, y + size * .35);
      ctx.quadraticCurveTo(x, y + size * .48, x + w * .31, y + size * .3); ctx.stroke();
      ctx.fillStyle = '#fff8f2'; ctx.font = dateFont; ctx.fillText(date, x, y + size * .79);
      if (label) { ctx.font = labelFont; ctx.fillText(label, x, y + size * 1.18); }
      const starX = x + w * .43, starY = y - size * .54, ray = size * .12;
      ctx.fillStyle = '#fff1db'; ctx.beginPath();
      ctx.moveTo(starX, starY - ray); ctx.lineTo(starX + ray * .22, starY - ray * .22);
      ctx.lineTo(starX + ray, starY); ctx.lineTo(starX + ray * .22, starY + ray * .22);
      ctx.lineTo(starX, starY + ray); ctx.lineTo(starX - ray * .22, starY + ray * .22);
      ctx.lineTo(starX - ray, starY); ctx.lineTo(starX - ray * .22, starY - ray * .22);
      ctx.closePath(); ctx.fill();
    } else if (style === 'vhs') {
      const top = label ? label.toUpperCase() : 'PLAY  SP';
      const topFont = `700 ${size * .24}px ${mono}`;
      const dateFont = `700 ${size * .43}px ${mono}`;
      const timeFont = `700 ${size * .8}px ${mono}`;
      const w = Math.max(textWidth(top, topFont), textWidth(date, dateFont), textWidth(time, timeFont));
      const left = x - w / 2;
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,.92)'; ctx.shadowBlur = size * .14;
      ctx.fillStyle = '#f4fff8'; ctx.font = topFont; ctx.fillText(top, left, y - size * .63);
      ctx.fillStyle = 'rgba(255,76,149,.7)'; ctx.font = dateFont; ctx.fillText(date, left + size * .035, y - size * .08);
      ctx.fillStyle = 'rgba(79,240,243,.7)'; ctx.fillText(date, left - size * .035, y - size * .08);
      ctx.fillStyle = '#fffdf5'; ctx.fillText(date, left, y - size * .08);
      ctx.font = timeFont; ctx.fillText(time, left, y + size * .55);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.68)';
      for (let i = 0; i < 3; i++) ctx.fillRect(left, y + size * (.79 + i * .045), w * (.82 - i * .09), size * .012);
    } else if (style === 'tape') {
      const dateFont = `700 ${size * .38}px ${mono}`;
      const timeFont = `700 ${size * .57}px ${mono}`;
      const labelFont = `600 ${size * .22}px ${mono}`;
      const w = Math.max(textWidth(date, dateFont), textWidth(time, timeFont), label ? textWidth(label, labelFont) : 0) + size * .95;
      const h = size * (label ? 1.93 : 1.58);
      ctx.translate(x, y); ctx.rotate(-.045);
      const left = -w / 2, right = w / 2, top = -h / 2, bottom = h / 2;
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = size * .2; ctx.shadowOffsetY = size * .11;
      ctx.beginPath(); ctx.moveTo(left + size * .12, top); ctx.lineTo(right - size * .12, top);
      ctx.lineTo(right, top + size * .16); ctx.lineTo(right - size * .1, top + size * .35);
      ctx.lineTo(right, top + size * .53); ctx.lineTo(right - size * .08, bottom - size * .2);
      ctx.lineTo(right - size * .12, bottom); ctx.lineTo(left + size * .12, bottom);
      ctx.lineTo(left, bottom - size * .17); ctx.lineTo(left + size * .1, bottom - size * .36);
      ctx.lineTo(left, top + size * .33); ctx.closePath();
      ctx.fillStyle = 'rgba(252,241,210,.95)'; ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(113,84,55,.42)'; ctx.lineWidth = size * .018; ctx.stroke();
      ctx.fillStyle = '#473a30'; ctx.font = dateFont; ctx.fillText(date, 0, -size * .25);
      ctx.fillStyle = '#302a26'; ctx.font = timeFont; ctx.fillText(time, 0, size * .28);
      if (label) { ctx.fillStyle = '#695748'; ctx.font = labelFont; ctx.fillText(label.toUpperCase(), 0, size * .69); }
    } else if (style === 'proof') {
      const imprint = `${date}  ${time}`;
      const imprintFont = `700 ${size * .45}px ${mono}`;
      const edgeFont = `700 ${size * .24}px ${mono}`;
      const w = Math.max(textWidth(imprint, imprintFont) + size * .72, size * 5.2);
      const h = size * 2.05;
      const centerX = Math.max(w / 2 + size * .06, Math.min(width - w / 2 - size * .06, x));
      const left = centerX - w / 2, top = y - h / 2;
      roundedRect(ctx, left, top, w, h, size * .08);
      ctx.fillStyle = 'rgba(23,15,10,.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(227,180,120,.58)'; ctx.lineWidth = size * .026; ctx.stroke();
      ctx.fillStyle = 'rgba(245,207,154,.68)';
      for (let hole = left + size * .27; hole < left + w - size * .27; hole += size * .55) {
        roundedRect(ctx, hole, top + size * .12, size * .2, size * .13, size * .025); ctx.fill();
        roundedRect(ctx, hole, top + h - size * .25, size * .2, size * .13, size * .025); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(220,165,103,.36)'; ctx.lineWidth = size * .02;
      ctx.beginPath();
      ctx.moveTo(left + size * .16, top + size * .38); ctx.lineTo(left + w - size * .16, top + size * .38);
      ctx.moveTo(left + size * .16, top + h - size * .38); ctx.lineTo(left + w - size * .16, top + h - size * .38);
      ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = edgeFont; ctx.fillStyle = '#d9ad76';
      ctx.fillText((label || '35MM / FRAME 24A').toUpperCase(), left + size * .33, y - size * .38, w - size * .66);
      ctx.textAlign = 'center'; ctx.font = imprintFont;
      ctx.fillStyle = 'rgba(247,94,37,.35)'; ctx.fillText(imprint, centerX + size * .035, y + size * .24, w - size * .35);
      ctx.shadowColor = 'rgba(255,127,54,.55)'; ctx.shadowBlur = size * .11;
      ctx.fillStyle = '#ffc184'; ctx.fillText(imprint, centerX, y + size * .2, w - size * .35);
    } else if (style === 'postcard') {
      const dateFont = `italic 700 ${size * .78}px Georgia, serif`;
      const timeFont = `italic 600 ${size * .5}px Georgia, serif`;
      const labelFont = `italic 500 ${size * .24}px Georgia, serif`;
      const w = Math.max(textWidth(date, dateFont), textWidth(time, timeFont), label ? textWidth(label, labelFont) : 0) + size * .78;
      const h = size * (label ? 2.25 : 1.9);
      roundedRect(ctx, x - w / 2, y - h / 2, w, h, size * .12);
      ctx.fillStyle = 'rgba(29,35,31,.62)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,221,.72)'; ctx.lineWidth = size * .02; ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = size * .12;
      ctx.fillStyle = '#fff5db'; ctx.font = dateFont; ctx.fillText(date, x, y - size * .34);
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(255,246,221,.68)'; ctx.lineWidth = size * .018;
      ctx.beginPath(); ctx.moveTo(x - w / 2 + size * .3, y + size * .14); ctx.lineTo(x + w / 2 - size * .3, y + size * .14); ctx.stroke();
      ctx.fillStyle = '#ffedca'; ctx.font = timeFont; ctx.fillText(time, x, y + size * .46);
      if (label) { ctx.font = labelFont; ctx.fillText(label, x, y + size * .9); }
    } else {
      const timeFont = `700 ${size * 1.05}px ${mono}`;
      const dateFont = `700 ${size * .34}px ${mono}`;
      const labelFont = `700 ${size * .23}px ${mono}`;
      const w = Math.max(textWidth(time, timeFont), textWidth(date, dateFont), label ? textWidth(label, labelFont) : 0);
      const left = x - w / 2;
      ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,.82)'; ctx.shadowBlur = size * .16; ctx.shadowOffsetY = size * .04;
      ctx.fillStyle = '#ffd18a'; ctx.font = dateFont; ctx.fillText(date, left, y - size * .56);
      ctx.fillStyle = '#ffb35d'; ctx.font = timeFont; ctx.fillText(time, left, y + size * .16);
      if (label) { ctx.font = labelFont; ctx.fillText(label, left, y + size * .94); }
    }
    ctx.restore();
  }

  function renderStyleSamples() {
    const backgrounds = {
      classic: ['#4b5851', '#1b2723'], minimal: ['#566366', '#273234'], cctv: ['#2d4039', '#101d19'],
      lcd: ['#2d4734', '#0b1b10'], proof: ['#4b4640', '#241d1a'], postcard: ['#65736f', '#263631'],
      digital: ['#483733', '#171b1c'], 'digital-clear': ['#617574', '#293d42'], story: ['#887b8d', '#453c4b'], vhs: ['#364d64', '#131e2b'], tape: ['#66716a', '#25342e']
    };
    $$('.style-card').forEach((card) => {
      const canvas = $('canvas', card);
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
      ctx.setTransform(canvas.width / rect.width, 0, 0, canvas.height / rect.height, 0, 0);
      const [start, end] = backgrounds[card.dataset.style];
      const background = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      background.addColorStop(0, start); background.addColorStop(1, end);
      ctx.fillStyle = background; ctx.fillRect(0, 0, rect.width, rect.height);
      drawStamp(ctx, rect.width, rect.height, { style: card.dataset.style, x: .5, y: .5, size: Math.min(22, rect.width * .125) });
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(t('canvasError'))), type, quality));
  }

  async function exportImage() {
    if (!state.file || !state.renderBlob) return;
    if (!els.date.value || !els.time.value) { toast(t('enterDateTime')); return; }
    els.processing.hidden = false;
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
    try {
      const MAX_PIXELS = 20000000;
      const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (state.width * state.height)));
      const width = Math.round(state.width * scale), height = Math.round(state.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(els.photoPreview, 0, 0, width, height);
      drawStamp(ctx, width, height);
      const type = els.outputFormat.value;
      let blob = await canvasToBlob(canvas, type, Number(els.quality.value));
      if (type === 'image/jpeg') blob = await injectExif(blob, exifDateTime(), els.timezone.value);
      const ext = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
      const compactTime = els.time.value.replaceAll(':', '').slice(0, 6);
      state.resultName = `Gakin_${els.date.value.replaceAll('-', '')}_${compactTime}.${ext}`;
      state.resultBlob = blob;
      if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
      state.resultUrl = URL.createObjectURL(blob);
      els.resultImage.src = state.resultUrl;
      els.resultDate.textContent = `${exifDateTime()} ${els.timezone.value}`;
      els.resultFile.textContent = `${width}×${height} · ${humanBytes(blob.size)}`;
      const verified = type === 'image/jpeg' ? parseExifDate(await blob.arrayBuffer()) : null;
      state.resultMetadataStatus = type === 'image/jpeg' && verified ? 'exifVerified' : 'exifLimited';
      els.resultExif.textContent = t(state.resultMetadataStatus);
      const shareFile = new File([blob], state.resultName, { type });
      els.shareBtn.hidden = !(navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] }));
      els.resultDialog.showModal();
      if (scale < 1) toast(t('hugeResize'));
    } catch (error) {
      console.error(error);
      toast(error.message || t('createError'));
    } finally {
      els.processing.hidden = true;
    }
  }

  function downloadResult() {
    if (!state.resultBlob) return;
    const anchor = document.createElement('a');
    anchor.href = state.resultUrl; anchor.download = state.resultName;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    toast(t('downloadStarted'));
  }

  async function shareResult() {
    if (!state.resultBlob) return;
    const type = state.resultBlob.type;
    try {
      await navigator.share({ files: [new File([state.resultBlob], state.resultName, { type })], title: t('shareTitle') });
    } catch (error) {
      if (error.name !== 'AbortError') { downloadResult(); toast(t('shareFallback')); }
    }
  }

  function chooseOriginal() {
    if (!state.originalDate) return;
    const match = state.originalDate.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return;
    els.date.value = `${match[1]}-${match[2]}-${match[3]}`;
    els.time.value = `${match[4]}:${match[5]}:${match[6]}`;
    setQuickChoice('original'); updateStamp();
  }

  function chooseCustom() {
    els.date.value = state.customDate;
    els.time.value = state.customTime;
    setQuickChoice('custom'); updateStamp();
  }

  window.GakinExif = Object.freeze({ buildExifSegment, injectExif, parseExifDate });

  els.selectBtn.addEventListener('click', () => els.fileInput.click());
  els.replaceBtn.addEventListener('click', () => els.fileInput.click());
  els.cameraBtn.addEventListener('click', () => els.cameraInput.click());
  els.fileInput.addEventListener('change', (event) => loadFile(event.target.files[0]));
  els.cameraInput.addEventListener('change', (event) => loadFile(event.target.files[0]));
  els.dropZone.addEventListener('dragover', (event) => { event.preventDefault(); els.dropZone.classList.add('is-dragging'); });
  els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('is-dragging'));
  els.dropZone.addEventListener('drop', (event) => { event.preventDefault(); els.dropZone.classList.remove('is-dragging'); loadFile(event.dataTransfer.files[0]); });
  [els.date, els.time].forEach((el) => {
    const syncValue = () => {
      state.customDate = els.date.value;
      state.customTime = els.time.value;
      setQuickChoice('custom'); updateStamp();
    };
    el.addEventListener('input', syncValue);
    el.addEventListener('change', syncValue);
    el.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 980px)').matches && typeof el.showPicker === 'function') {
        try { el.showPicker(); } catch {}
      }
    });
  });
  [els.label, els.dateFormat, els.size].forEach((el) => el.addEventListener('input', updateStamp));
  els.custom.addEventListener('click', chooseCustom);
  els.original.addEventListener('click', chooseOriginal);
  els.outputFormat.addEventListener('change', updateFormatNote);
  els.stylePicker.addEventListener('click', (event) => {
    const button = event.target.closest('[data-style]');
    if (!button) return;
    state.style = button.dataset.style;
    $$('.style-card').forEach((card) => { const selected = card === button; card.classList.toggle('selected', selected); card.setAttribute('aria-checked', String(selected)); });
    positionOverlay();
  });

  let pointerId = null;
  els.stamp.addEventListener('pointerdown', (event) => { pointerId = event.pointerId; els.stamp.setPointerCapture(pointerId); });
  els.stamp.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return;
    const rect = els.stamp.getBoundingClientRect();
    state.x = Math.max(.04, Math.min(.96, (event.clientX - rect.left) / rect.width));
    state.y = Math.max(.05, Math.min(.95, (event.clientY - rect.top) / rect.height));
    positionOverlay();
  });
  els.stamp.addEventListener('pointerup', () => { pointerId = null; });
  els.stamp.addEventListener('pointercancel', () => { pointerId = null; });
  els.stamp.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? .05 : .01;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') state.x -= step;
    if (event.key === 'ArrowRight') state.x += step;
    if (event.key === 'ArrowUp') state.y -= step;
    if (event.key === 'ArrowDown') state.y += step;
    state.x = Math.max(.04, Math.min(.96, state.x)); state.y = Math.max(.05, Math.min(.95, state.y)); positionOverlay();
  });
  window.addEventListener('resize', () => { positionOverlay(); renderStyleSamples(); });
  els.languageButtons.forEach((button) => button.addEventListener('click', () => {
    applyLanguage(button.dataset.language, true);
    els.languageMenu.open = false;
  }));
  els.themeButtons.forEach((button) => button.addEventListener('click', () => {
    applyTheme(button.dataset.themeChoice, true);
    els.themeMenu.open = false;
  }));
  els.languageReset.addEventListener('click', () => {
    applyLanguage('system', true);
    els.languageMenu.open = false;
  });
  els.themeReset.addEventListener('click', () => {
    applyTheme('system', true);
    els.themeMenu.open = false;
  });
  [els.languageMenu, els.themeMenu].forEach((menu) => menu.addEventListener('toggle', () => {
    if (menu.open) [els.languageMenu, els.themeMenu].forEach((other) => { if (other !== menu) other.open = false; });
  }));
  document.addEventListener('click', (event) => {
    [els.languageMenu, els.themeMenu].forEach((menu) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openMenu = [els.languageMenu, els.themeMenu].find((menu) => menu.open);
      if (openMenu) {
        openMenu.open = false;
        openMenu.querySelector('summary').focus();
      }
    }
  });
  const followSystemTheme = () => { if (state.themeChoice === 'system') applyTheme('system'); };
  if (systemTheme.addEventListener) systemTheme.addEventListener('change', followSystemTheme);
  else systemTheme.addListener(followSystemTheme);
  window.addEventListener('languagechange', () => { if (state.languageChoice === 'system') applyLanguage('system'); });
  $$('.dialog-close').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
  [els.resultDialog].forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
  els.exportBtn.addEventListener('click', exportImage);
  els.downloadBtn.addEventListener('click', downloadResult);
  els.shareBtn.addEventListener('click', shareResult);

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const styles = ['classic', 'minimal', 'cctv', 'lcd', 'proof', 'postcard', 'digital', 'digital-clear', 'story', 'vhs', 'tape'];
    try {
      void Promise.resolve(context.registerTool({
        name: 'configure_timestamp',
        title: '타임스탬프 설정',
        description: '현재 사진 편집기의 날짜, 시간, 시간대, 문구와 시계 디자인을 설정합니다. 사진 선택과 최종 저장은 사용자가 직접 합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'YYYY-MM-DD 형식의 날짜' },
            time: { type: 'string', pattern: '^\\d{2}:\\d{2}(:\\d{2})?$', description: 'HH:MM 또는 HH:MM:SS 형식의 시간' },
            timezone: { type: 'string', enum: ['+09:00', '+00:00', '-08:00', '-05:00', '+01:00', '+08:00'] },
            style: { type: 'string', enum: styles },
            label: { type: 'string', maxLength: 28 },
            size: { type: 'integer', minimum: 4, maximum: 14 }
          },
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('설정값은 객체여야 합니다.');
          if (input.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('날짜 형식이 올바르지 않습니다.');
          if (input.time !== undefined && !/^\d{2}:\d{2}(:\d{2})?$/.test(input.time)) throw new Error('시간 형식이 올바르지 않습니다.');
          if (input.style !== undefined && !styles.includes(input.style)) throw new Error('지원하지 않는 디자인입니다.');
          if (input.label !== undefined && (typeof input.label !== 'string' || input.label.length > 28)) throw new Error('문구는 28자 이하여야 합니다.');
          if (input.size !== undefined && (!Number.isInteger(input.size) || input.size < 4 || input.size > 14)) throw new Error('크기는 4에서 14 사이의 정수여야 합니다.');
          if (input.date !== undefined) els.date.value = input.date;
          if (input.time !== undefined) els.time.value = input.time.length === 5 ? `${input.time}:00` : input.time;
          if (input.timezone !== undefined) els.timezone.value = input.timezone;
          if (input.label !== undefined) els.label.value = input.label;
          if (input.size !== undefined) els.size.value = String(input.size);
          if (input.style !== undefined) {
            const card = $(`[data-style="${input.style}"]`);
            if (card) card.click();
          }
          state.customDate = els.date.value;
          state.customTime = els.time.value;
          setQuickChoice('custom'); updateStamp();
          return { configured: true, date: els.date.value, time: els.time.value, timezone: els.timezone.value, style: state.style, label: els.label.value, size: Number(els.size.value) };
        }
      })).catch((error) => console.warn('WebMCP 도구 등록 실패', error));
    } catch (error) { console.warn('WebMCP 도구 등록 실패', error); }
  }

  let savedLanguage = null, savedTheme = 'system';
  try {
    savedLanguage = localStorage.getItem('gakin-language-choice');
    savedTheme = localStorage.getItem('gakin-theme') || 'system';
  } catch {}
  applyTheme(savedTheme);
  applyLanguage(['system', 'ko', 'en'].includes(savedLanguage) ? savedLanguage : 'system');
  setCustomToNow();
  registerWebMcp();
})();
