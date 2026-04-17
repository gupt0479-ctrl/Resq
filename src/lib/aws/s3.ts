import "server-only"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_S3_BUCKET,
  AWS_SECRET_ACCESS_KEY,
  isAwsArtifactsConfigured,
} from "@/lib/env"

/**
 * Lightweight, optional S3 helper for storing TinyFish-style evidence
 * artifacts. If AWS env is missing, every method no-ops with
 * `{ skipped: true }` instead of throwing. No existing route uses this yet —
 * it exists so future rescue agent runs can persist audit payloads.
 */

export interface PutArtifactResult {
  key: string
  skipped: boolean
  bucket?: string
  region?: string
  error?: string
}

export function isConfigured(): boolean {
  return isAwsArtifactsConfigured()
}

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  _client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId:     AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  })
  return _client
}

async function putObject(opts: {
  key:         string
  body:        string | Uint8Array
  contentType: string
}): Promise<PutArtifactResult> {
  if (!isConfigured()) {
    return { key: opts.key, skipped: true }
  }
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket:      AWS_S3_BUCKET,
        Key:         opts.key,
        Body:        opts.body,
        ContentType: opts.contentType,
      })
    )
    return {
      key:     opts.key,
      skipped: false,
      bucket:  AWS_S3_BUCKET,
      region:  AWS_REGION,
    }
  } catch (err) {
    return {
      key:     opts.key,
      skipped: false,
      bucket:  AWS_S3_BUCKET,
      region:  AWS_REGION,
      error:   err instanceof Error ? err.message : "Unknown S3 error",
    }
  }
}

export async function putJsonArtifact(
  key: string,
  payload: unknown
): Promise<PutArtifactResult> {
  return putObject({
    key,
    body:        JSON.stringify(payload, null, 2),
    contentType: "application/json",
  })
}

export async function putTextArtifact(
  key: string,
  body: string
): Promise<PutArtifactResult> {
  return putObject({
    key,
    body,
    contentType: "text/plain; charset=utf-8",
  })
}
