# CRE Lease Assistant

A minimal Commercial Real Estate (CRE) lease assistant prototype built with Next.js 14, featuring:
- Rent roll CSV upload and parsing
- Lease PDF upload with text extraction
- RAG-style Q&A over lease documents using LLMs (Anthropic Claude or OpenAI GPT)
- Simple property and lease management UI

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **File Storage**: Local filesystem (`/uploads`)
- **PDF Processing**: pdf-parse
- **LLM Integration**: Anthropic Claude API or OpenAI API

## Project Structure

```
cre_ai_platform/
├── app/
│   ├── api/
│   │   ├── ask-lease/          # Q&A endpoint
│   │   ├── leases/              # Get all leases
│   │   ├── upload-lease-pdf/    # PDF upload endpoint
│   │   └── upload-rent-roll/    # CSV upload endpoint
│   ├── leases/
│   │   └── [id]/                # Individual lease detail page
│   ├── properties/              # Properties listing page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage with upload forms
├── components/
│   ├── LeasePdfUpload.tsx       # PDF upload component
│   ├── LeaseQA.tsx              # Q&A component
│   └── RentRollUpload.tsx       # CSV upload component
├── lib/
│   ├── llm.ts                   # LLM abstraction layer
│   └── prisma.ts                # Prisma client
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seed script
├── uploads/                     # File uploads (created at runtime)
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your LLM API key:

```env
# Database
DATABASE_URL="file:./dev.db"

# LLM Configuration
# Set LLM_PROVIDER to either "anthropic" or "openai"
LLM_PROVIDER="anthropic"

# For Anthropic (Claude)
ANTHROPIC_API_KEY="your-anthropic-api-key-here"

# For OpenAI (GPT)
# OPENAI_API_KEY="your-openai-api-key-here"
```

**Where to get API keys:**
- **Anthropic**: https://console.anthropic.com/ (recommended)
- **OpenAI**: https://platform.openai.com/api-keys

### 3. Set Up the Database

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

The migration will create a SQLite database at `prisma/dev.db` with three tables:
- `Property` - Real estate properties
- `Lease` - Tenant leases
- `LeaseDocument` - PDF documents with extracted text

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Demo Flow

### Step 1: Upload a Rent Roll CSV

1. Navigate to http://localhost:3000
2. In the "Upload Rent Roll CSV" section, click "Choose File"
3. Select a CSV file with the following columns:
   - `property_name` - Name of the property
   - `address` - Property address
   - `tenant_name` - Tenant name
   - `suite` - Suite number
   - `square_feet` - Lease square footage
   - `base_rent` - Monthly base rent
   - `lease_start` - Lease start date (YYYY-MM-DD)
   - `lease_end` - Lease end date (YYYY-MM-DD)
4. Click "Upload Rent Roll"

**Sample CSV content:**
```csv
property_name,address,tenant_name,suite,square_feet,base_rent,lease_start,lease_end
Downtown Plaza,123 Main St,Acme Corp,101,2500,5000,2023-01-01,2025-12-31
Downtown Plaza,123 Main St,Tech Inc,202,3200,7500,2023-06-01,2028-05-31
```

### Step 2: Upload a Lease PDF

1. In the "Upload Lease PDF" section, select a lease from the dropdown
2. Click "Choose File" and select a PDF document
3. Click "Upload Lease PDF"
4. The system will extract text from the PDF and store it in the database

### Step 3: View Properties and Leases

1. Click "View Properties & Leases" button
2. You'll see all properties with their associated leases
3. Click on any lease to view its details

### Step 4: Ask Questions About a Lease

1. On the lease detail page, scroll to the "Ask Questions About This Lease" section
2. Enter a question, such as:
   - "What is the annual rent escalation percentage?"
   - "What are the tenant's maintenance responsibilities?"
   - "When is the lease renewal date?"
   - "What is the security deposit amount?"
3. Click "Ask Question"
4. The system will use the LLM to answer based on the lease metadata and extracted PDF text
5. Previous questions and answers are displayed in the Q&A history

## Database Management

### View Database with Prisma Studio

```bash
npm run db:studio
```

This opens a web interface at http://localhost:5555 to browse and edit your data.

### Reset Database

```bash
rm prisma/dev.db
npm run db:migrate
npm run db:seed
```

## API Endpoints

### POST /api/upload-rent-roll
Upload and parse a rent roll CSV file.

**Request:** `multipart/form-data` with `rentRoll` file
**Response:**
```json
{
  "success": true,
  "message": "Imported 1 properties and 2 leases",
  "stats": {
    "propertiesCreated": 1,
    "leasesCreated": 2
  }
}
```

### POST /api/upload-lease-pdf
Upload a PDF for a specific lease.

**Request:** `multipart/form-data` with `leaseId` and `file`
**Response:**
```json
{
  "success": true,
  "message": "Lease PDF uploaded successfully",
  "document": {
    "id": "...",
    "filename": "...",
    "textLength": 5432
  }
}
```

### POST /api/ask-lease
Ask a question about a lease.

**Request:**
```json
{
  "leaseId": "clx123...",
  "question": "What is the rent escalation clause?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "The lease includes a 3% annual rent escalation...",
  "metadata": { ... },
  "hasDocument": true
}
```

### GET /api/leases
Get all leases with property information.

**Response:**
```json
{
  "success": true,
  "leases": [...]
}
```

## LLM Configuration

The application uses an abstraction layer (`lib/llm.ts`) that supports both Anthropic and OpenAI:

- **Anthropic**: Uses `claude-3-5-sonnet-20241022` model
- **OpenAI**: Uses `gpt-4-turbo-preview` model

To switch providers, change the `LLM_PROVIDER` in your `.env` file and ensure the corresponding API key is set.

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
```

## Notes

- PDF files are stored locally in the `uploads/leases/` directory
- The Q&A system truncates lease text to 10,000 characters to fit within LLM context limits
- No authentication is implemented - this is a prototype for demonstration purposes
- The database uses SQLite for simplicity - consider PostgreSQL for production use

## Next Steps

Potential enhancements for a production version:
- Add user authentication and authorization
- Implement proper multi-tenancy
- Use cloud storage (S3) for PDF files
- Add vector embeddings for better semantic search
- Implement chunking strategy for long documents
- Add caching for LLM responses
- Enhance error handling and validation
- Add unit and integration tests
- Implement audit logging
