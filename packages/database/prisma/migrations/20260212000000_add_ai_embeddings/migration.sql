-- Enable pgvector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Embeddings table for RAG (Retrieval-Augmented Generation)
CREATE TABLE "ai_embeddings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "embedding" vector(768),
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

-- Index for resource lookups (update/delete on source change)
CREATE INDEX "idx_embeddings_resource" ON "ai_embeddings"("resource_type", "resource_id");

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX "idx_embeddings_vector" ON "ai_embeddings"
    USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
