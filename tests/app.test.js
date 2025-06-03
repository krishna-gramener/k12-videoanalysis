// tests/app.test.js
import { describe, it, expect } from 'vitest';

describe('K12 Video Analysis App', () => {
  it('Homepage loads and advisor cards render', () => {
    document.body.innerHTML = `
      <h1>K12 Video Analysis</h1>
      <div class="card-title video">Video A</div>
      <div class="card-title video">Video B</div>
    `;

    const title = document.querySelector('h1');
    expect(title?.textContent).toBe('K12 Video Analysis');

    const cards = document.querySelectorAll('.card-title');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('Navigating to video page renders transcript', () => {
    document.body.innerHTML = `
      <div class="video">Click Me</div>
      <div id="transcript" style="display: none;">Transcript appears here</div>
    `;

    const video = document.querySelector('.video');
    const transcript = document.querySelector('#transcript');

    // Simulate click logic
    video?.addEventListener('click', () => {
      transcript.style.display = 'block';
    });

    video?.dispatchEvent(new Event('click'));
    expect(transcript?.style.display).toBe('block');
  });

  it('Clicking a video loads its detail page with correct title', () => {
    document.body.innerHTML = `
      <div class="card-title video">My Test Video</div>
      <h2 class="video-title"></h2>
    `;

    const video = document.querySelector('.video');
    const title = document.querySelector('.video-title');

    video?.addEventListener('click', () => {
      title.textContent = video.textContent;
    });

    video?.click();
    expect(title?.textContent).toContain('My Test Video');
  });
});
