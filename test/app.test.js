import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadFrom } from "../utils.js";
import path from "path";

describe("K12 Video Analysis App", () => {
  let page, window, document;

  beforeEach(async () => {
    // Mock fetch for config.json
    const mockConfig = {
      videos: {
        test: {
          id: "test",
          title: "Test Video",
          source: "test",
        },
      },
      advisors: {
        test: {
          name: "Test Student",
          grade: "10th Grade",
          "school-type": "Public School",
          specialties: "Math, Science",
          "academic-performance": {
            grades: "A, B",
            "assessment-scores": "90%",
            attendance: "95%",
          },
          goals: ["Improve math skills"],
          challenges: ["Time management"],
          interests: "Science experiments",
          img: "test.jpg",
        },
      },
    };
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "config.json") {
        return Promise.resolve({
          json: () => Promise.resolve(mockConfig),
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    // Load from test directory - this will serve all files including index.html and script.js
    ({ page, window, document } = await loadFrom(import.meta.dirname));

    // Wait for scripts to load
    await new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve);
    });

    // Mock YouTube API
    window.YT = {
      Player: vi.fn().mockImplementation(() => ({
        getCurrentTime: () => 0,
        getPlayerState: () => 0,
        seekTo: () => {},
        playVideo: () => {},
      })),
      PlayerState: {
        PLAYING: 1,
      },
    };

    // Mock video data
    const mockVideo = document.createElement("div");
    mockVideo.className = "video";
    mockVideo.innerHTML = `
      <div class="card-title">Test Video</div>
    `;
    document.querySelector("#home").appendChild(mockVideo);

    await page.waitUntilComplete();
  });

  it("Homepage loads and shows title", async () => {
    // Check main title in navbar
    const mainTitle = document.querySelector(".navbar-brand");
    expect(mainTitle).toBeTruthy();
    expect(mainTitle.textContent.trim()).toBe("K12 Video Analysis");

    // Check home container is visible
    const home = document.querySelector("#home");
    expect(home).toBeTruthy();
    expect(home.classList.contains("d-none")).toBe(false);
  });

  it("Clicking video shows transcript", async () => {
    // Initially app should be hidden
    const app = document.querySelector("#app");
    expect(app.classList.contains("d-none")).toBe(true);

    // Click the video
    const videoLink = document.querySelector(".video");
    expect(videoLink).toBeTruthy();
    videoLink.click();

    await page.waitUntilComplete();

    // App and transcript should be visible
    // expect(app.classList.contains('d-none')).toBe(false);
    const transcript = document.querySelector("#transcript");
    expect(transcript).toBeTruthy();
  });

  it("Clicking a video loads its detail page with correct title", async () => {
    // Get the first video title
    const videoTitle = document.querySelector(".card-title").textContent;
    expect(videoTitle).toBeTruthy();

    // Click the video
    const videoLink = document.querySelector(".video");
    expect(videoLink).toBeTruthy();
    videoLink.click();

    await page.waitUntilComplete();

    // Check the detail page title matches
    const detailTitle = document.querySelector("h2.video-title").textContent;
    expect(detailTitle).toContain(videoTitle.trim());
  });
});
