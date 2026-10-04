/* global NexT */

(() => {
  'use strict';

  const THEME_KEY = 'yjm-theme';

  const getTheme = () => document.documentElement.dataset.theme || 'light';

  const updateThemeButton = button => {
    const dark = getTheme() === 'dark';
    const icon = button.querySelector('i');
    if (icon) icon.className = `fa ${dark ? 'fa-sun' : 'fa-moon'}`;
    button.setAttribute('aria-label', dark ? '切换浅色模式' : '切换深色模式');
    button.title = dark ? '切换浅色模式' : '切换深色模式';
    button.classList.toggle('is-dark', dark);
  };

  const applyTheme = (theme, animate = false) => {
    const root = document.documentElement;
    if (animate) root.classList.add('theme-transition');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    document.querySelectorAll('.yjm-theme-toggle').forEach(updateThemeButton);
    if (animate) {
      window.setTimeout(() => root.classList.remove('theme-transition'), 420);
    }
  };

  const setupThemeToggle = () => {
    document.querySelectorAll('.yjm-theme-toggle').forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = 'true';
      updateThemeButton(button);
      const toggle = () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
      button.addEventListener('click', toggle);
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
  };

  const setupReadingMeta = () => {
    document.querySelectorAll('.yjm-reading-meta').forEach(meta => {
      if (meta.dataset.ready) return;
      const article = meta.closest('.post-content');
      const content = article?.querySelector('.post-body');
      if (!content) return;

      const text = (content.innerText || content.textContent || '').replace(/\s/g, '');
      const chineseCharacters = (text.match(/[\u3400-\u9fff]/g) || []).length;
      const latinWords = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
      const count = chineseCharacters + latinWords;
      const minutes = Math.max(1, Math.ceil(count / 450));
      const countElement = meta.querySelector('.yjm-reading-count');
      const timeElement = meta.querySelector('.yjm-reading-time');
      if (countElement) countElement.textContent = `${count.toLocaleString('zh-CN')} 字`;
      if (timeElement) timeElement.textContent = `${minutes} 分钟`;
      meta.dataset.ready = 'true';
      meta.hidden = false;
    });
  };

  const setupTocToggle = () => {
    if (!document.body.dataset.yjmTocObserver) {
      const syncTocState = () => {
        const expanded = String(document.body.classList.contains('sidebar-active'));
        document.querySelectorAll('.yjm-toc-toggle').forEach(button => button.setAttribute('aria-expanded', expanded));
      };
      new MutationObserver(syncTocState).observe(document.body, {attributes: true, attributeFilter: ['class']});
      document.body.dataset.yjmTocObserver = 'true';
    }
    document.querySelectorAll('.yjm-toc-toggle').forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = 'true';
      const syncExpandedState = () => button.setAttribute('aria-expanded', String(document.body.classList.contains('sidebar-active')));
      syncExpandedState();
      button.addEventListener('click', () => {
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle && !document.body.classList.contains('sidebar-active')) sidebarToggle.click();
        const tocTab = document.querySelector('.sidebar-nav-toc');
        if (tocTab && !document.querySelector('.sidebar-inner.sidebar-toc-active')) tocTab.click();
        syncExpandedState();
      });
    });
  };

  const showToast = (message, success) => {
    let toast = document.querySelector('.yjm-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'yjm-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa ${success ? 'fa-check' : 'fa-triangle-exclamation'}" aria-hidden="true"></i><span>${message}</span>`;
    toast.classList.toggle('is-error', !success);
    toast.classList.remove('is-visible');
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.clearTimeout(toast.hideTimer);
    toast.hideTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
  };

  const enhanceCopyButton = button => {
    if (!button || button.dataset.yjmEnhanced) return;
    button.dataset.yjmEnhanced = 'true';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', '复制代码');
    button.title = '复制代码';
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
    button.addEventListener('click', () => {
      const icon = button.querySelector('i');
      if (!icon) return;
      button.classList.remove('is-success', 'is-error');
      button.setAttribute('aria-label', '复制代码');
      let reported = false;
      const report = () => {
        if (reported) return;
        const className = icon.className;
        if (className.includes('check-circle')) {
          reported = true;
          button.classList.add('is-success');
          button.setAttribute('aria-label', '已复制');
          showToast('代码已复制', true);
        } else if (className.includes('times-circle')) {
          reported = true;
          button.classList.add('is-error');
          showToast('复制失败，请手动复制', false);
        }
      };
      const observer = new MutationObserver(() => {
        report();
        if (reported) observer.disconnect();
      });
      observer.observe(icon, {attributes: true, attributeFilter: ['class']});
      report();
      window.setTimeout(() => observer.disconnect(), 5000);
    });
  };

  const setupCopyButtons = () => document.querySelectorAll('.copy-btn').forEach(enhanceCopyButton);

  const patchCopyRegistration = () => {
    if (!window.NexT?.utils?.registerCopyButton || NexT.utils.registerCopyButton.__yjmPatched) return;
    const original = NexT.utils.registerCopyButton;
    const patched = function(...args) {
      original.apply(this, args);
      enhanceCopyButton(args[0]?.querySelector('.copy-btn'));
    };
    patched.__yjmPatched = true;
    NexT.utils.registerCopyButton = patched;
  };

  const setupSearchDialog = () => {
    const overlay = document.querySelector('.search-pop-overlay');
    const popup = document.querySelector('.search-popup');
    const input = document.querySelector('.search-input');
    if (!overlay || !popup || overlay.dataset.yjmEnhanced) return;
    overlay.dataset.yjmEnhanced = 'true';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', '站内搜索');
    input?.setAttribute('aria-label', '搜索文章');
    document.querySelector('.popup-btn-close')?.setAttribute('aria-label', '关闭搜索');
  };

  const init = () => {
    document.documentElement.classList.remove('theme-preload');
    patchCopyRegistration();
    setupThemeToggle();
    setupReadingMeta();
    setupTocToggle();
    setupCopyButtons();
    setupSearchDialog();
  };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:success', init);
})();
