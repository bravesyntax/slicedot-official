import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { MAX_IMAGE_BYTES } from "@/lib/admin/images";

// Issues upload tokens for product and category images (admin only). The browser uploads straight to Vercel Blob,
// so large images don't hit the 4.5 MB function body limit.
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Image uploads are not configured (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  // Only the token request comes from the admin's browser; the completion callback comes from Vercel Blob and is signed by it.
  if (body.type === "blob.generate-client-token" && !(await getAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^(products|categories)\/[\w.-]+\.(jpe?g|png|webp|gif)$/i.test(pathname)) throw new Error("Invalid image file name.");
        return { allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"], maximumSizeInBytes: MAX_IMAGE_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
