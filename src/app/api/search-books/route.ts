// GET /api/search-books?q=atomic+habits
// Fallback: Google Books → Open Library
export const runtime = "edge";

const GOOGLE_BOOKS_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ results: [], source: null });
  }

  // 1) Coba Google Books dulu
  if (GOOGLE_BOOKS_KEY) {
    try {
      const gRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&key=${GOOGLE_BOOKS_KEY}`
      );
      if (gRes.ok) {
        const data = await gRes.json();
        const results = (data.items || []).map(parseGoogleBook);
        if (results.length > 0) {
          return Response.json({ results, source: "google" });
        }
      }
    } catch {
      // fallthrough to Open Library
    }
  }

  // 2) Fallback: Open Library
  try {
    const oRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6`
    );
    if (oRes.ok) {
      const data = await oRes.json();
      const results = (data.docs || []).map(parseOpenLibraryDoc);
      if (results.length > 0) {
        return Response.json({ results, source: "openlibrary" });
      }
    }
  } catch {
    // empty
  }

  return Response.json({ results: [], source: null });
}

function parseGoogleBook(item: any) {
  const vi = item.volumeInfo || {};
  const idents = vi.industryIdentifiers || [];
  const isbn13 = idents.find((i: any) => i.type === "ISBN_13")?.identifier;
  const isbn10 = idents.find((i: any) => i.type === "ISBN_10")?.identifier;
  const isbn = isbn13 || isbn10 || null;

  let coverUrl = null;
  const il = vi.imageLinks || {};
  // prefer extraLarge → large → medium → small → thumbnail
  coverUrl = il.extraLarge || il.large || il.medium || il.small || il.thumbnail || null;
  if (coverUrl && coverUrl.startsWith("http:")) {
    coverUrl = coverUrl.replace("http:", "https:");
  }

  return {
    id: item.id,
    title: vi.title || "Tanpa Judul",
    author: (vi.authors || []).join(", ") || "Penulis tidak diketahui",
    year: parseYear(vi.publishedDate),
    isbn,
    publisher: vi.publisher || null,
    coverUrl,
    source: "google" as const,
  };
}

function parseOpenLibraryDoc(doc: any) {
  const authors = (doc.author_name || []).join(", ") || "Penulis tidak diketahui";
  const isbn = (doc.isbn || [])[0] || null;
  let coverUrl = null;
  if (doc.cover_i) {
    coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  }

  return {
    id: doc.key || `ol-${doc.cover_i || Math.random()}`,
    title: doc.title || "Tanpa Judul",
    author: authors,
    year: doc.first_publish_year || null,
    isbn,
    publisher: (doc.publisher || [])[0] || null,
    coverUrl,
    source: "openlibrary" as const,
  };
}

function parseYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}
