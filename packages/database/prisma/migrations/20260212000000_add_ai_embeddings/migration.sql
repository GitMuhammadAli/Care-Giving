-- Enable pgvector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Embeddings table for RAG (Retrieval-Augmented Generation)
CREATE TABLE "ai_embeddings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "embedding" vector(3072),
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "care_recipient_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "ai_embeddings_pkey" PRIMARY KEY ("id")
);

-- Index for filtering by family (security: scoped queries)
CREATE INDEX "idx_embeddings_family" ON "ai_embeddings"("family_id");

-- Index for filtering by care recipient (RAG queries scoped to a specific person)
CREATE INDEX "idx_embeddings_care_recipient" ON "ai_embeddings"("care_recipient_id") WHERE "care_recipient_id" IS NOT NULL;

-- Index for resource lookups (update/delete on source change)
CREATE INDEX "idx_embeddings_resource" ON "ai_embeddings"("resource_type", "resource_id");

-- Note: HNSW index has a 2000-dim limit in pgvector.
-- gemini-embedding-001 outputs 3072 dims, so we skip the vector index.
-- Sequential scan is fast for datasets under 100k rows.
-- For large-scale deployments, use outputDimensionality=768 or IVFFlat.
