
import YouTube from "youtube-sr";

console.log("YouTube export:", YouTube);

async function test() {
  try {
    if (typeof YouTube.search === 'function') {
        console.log("Searching for 'Push-Ups exercise form'...");
        const videos = await YouTube.search("Push-Ups exercise form", { limit: 1 });
        console.log("Result:", videos);
    } else {
        console.log("YouTube.search is not a function. Keys:", Object.keys(YouTube));
        // Try default export if it exists
        if ((YouTube as any).default && typeof (YouTube as any).default.search === 'function') {
             console.log("Found search on default export");
             const videos = await (YouTube as any).default.search("Push-Ups exercise form", { limit: 1 });
             console.log("Result:", videos);
        }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
