# Quick Setup Guide

Follow these steps to get the CRE Lease Assistant running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

```env
DATABASE_URL="file:./dev.db"
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
```

## 3. Initialize Database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 4. Start the Application

```bash
npm run dev
```

Visit http://localhost:3000

## Quick Test

1. Upload `sample-rent-roll.csv` from the project root
2. Navigate to "View Properties & Leases"
3. Click on a lease to view details
4. Upload a PDF lease document (optional)
5. Ask questions about the lease

That's it!
