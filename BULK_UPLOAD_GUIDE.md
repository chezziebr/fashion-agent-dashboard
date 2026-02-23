# Bulk Product Upload Guide

## Overview

The bulk uploader allows you to upload up to 100 product images at once with automatic SKU extraction from filenames and optional CSV metadata import.

## Features

- **Automatic SKU Extraction**: SKUs are extracted from image filenames
- **CSV Import**: Match images with product metadata from a CSV file
- **Default Values**: Set default brand, category, and garment type for all products
- **Live Preview**: See all images before uploading with status indicators
- **Error Handling**: Failed uploads are marked individually
- **Manual SKU Editing**: Edit SKUs before upload if extraction is incorrect

## How to Use

### 1. Prepare Your Images

Name your image files with the SKU as the filename or first part before a separator:

**Good Examples:**
- `TH8-001.jpg` → Extracts SKU: `TH8-001`
- `AZM-123.png` → Extracts SKU: `AZM-123`
- `TH8-001-blue-shirt.jpg` → Extracts SKU: `TH8-001`
- `PRODUCT_456.png` → Extracts SKU: `PRODUCT_456`

**Separators Supported:**
- Dash: `TH8-001-description.jpg`
- Underscore: `TH8_001_description.jpg`
- Space: `TH8 001 description.jpg`

### 2. (Optional) Prepare CSV File

Create a CSV file with your product metadata. The only **required** column is `sku`.

#### CSV Format

```csv
sku,name,brand,category,garment_type,color,color_hex,size_range,tags
TH8-001,Minimal Crew Tee,TH8TA,shirt,upper,Sage Green,#B2C9AB,XS-XL,casual;summer;bestseller
TH8-002,Recovery Jogger,TH8TA,pants,lower,Navy,#1E3A5F,S-XXL,athletic;comfort
AZM-100,Motion Short,ALMOST_ZERO_MOTION,shorts,lower,Black,#000000,XS-L,active;minimal
```

#### CSV Columns

| Column | Required | Description | Example Values |
|--------|----------|-------------|----------------|
| `sku` | **YES** | Product SKU code | `TH8-001`, `AZM-100` |
| `name` | No | Product name | `Minimal Crew Tee` |
| `brand` | No | Brand name | `TH8TA`, `ALMOST_ZERO_MOTION`, `OTHER` |
| `category` | No | Product category | `shirt`, `pants`, `dress`, `shorts` |
| `garment_type` | No | Body placement | `upper`, `lower`, `full`, `accessory` |
| `color` | No | Color name | `Sage Green`, `Navy`, `Black` |
| `color_hex` | No | Hex color code | `#B2C9AB`, `#1E3A5F` |
| `size_range` | No | Available sizes | `XS-XL`, `S-XXL` |
| `tags` | No | Semi-colon separated tags | `casual;summer;bestseller` |

**Note:** Column names are case-insensitive. `SKU`, `sku`, and `Sku` all work.

**Alternative Column Names:**
- `product_name` or `name` for product name
- `type` or `garment_type` for garment type
- `sizes` or `size_range` for size range
- `hex` or `color_hex` for color hex

### 3. Upload Process

1. **Click "Bulk Upload"** in the dashboard sidebar
2. **Upload Images**:
   - Click the image upload area
   - Select multiple image files (PNG, JPG)
   - SKUs will be auto-extracted from filenames
3. **Upload CSV** (Optional):
   - Click the CSV upload area
   - Select your CSV file
   - Matched products will show "Has CSV data" badge
4. **Set Default Values**:
   - Choose default Brand, Category, and Garment Type
   - These apply to products WITHOUT CSV data
5. **Review**:
   - Check extracted SKUs
   - Edit any incorrect SKUs by clicking on them
   - Remove unwanted images with the X button
6. **Upload**:
   - Click "Upload X Products"
   - Watch progress bar for upload status
   - Success/error indicators show per image

## Field Requirements

After the recent update, most fields are **optional**:

- **Required**: SKU only
- **Optional**: All other fields (name, brand, category, color, etc.)

If you don't provide data, defaults will be used:
- Name: `"Untitled Product"` or SKU
- Brand: `"TH8TA"`
- Category: `"apparel"`
- Garment Type: `"upper"`

## Example Workflow

### Scenario: Uploading 50 TH8TA Products

1. **Rename Images**:
   ```
   TH8-001.jpg
   TH8-002.jpg
   TH8-003.jpg
   ...
   TH8-050.jpg
   ```

2. **Create CSV** (optional):
   ```csv
   sku,name,category,color,size_range
   TH8-001,Minimal Crew Tee,shirt,Sage,XS-XL
   TH8-002,Recovery Jogger,pants,Navy,S-XXL
   TH8-003,Motion Short,shorts,Black,XS-L
   ```

3. **Upload**:
   - Select all 50 JPG files
   - Upload CSV
   - Set defaults: Brand=TH8TA, Category=apparel, Type=upper
   - Click Upload

4. **Result**:
   - Products with CSV data get full metadata
   - Products without CSV data use defaults + SKU

## Troubleshooting

### SKU Not Extracted Correctly

**Problem**: Image `product-photo-TH8001.jpg` extracts as `PRODUCT` instead of `TH8001`

**Solution**: Manually edit the SKU in the preview grid before uploading

### CSV Not Matching

**Problem**: CSV has 20 products but only 5 show "Has CSV data"

**Causes**:
- SKU mismatch (case-sensitive)
- Whitespace in CSV (trim your data)
- Wrong column name (must be exactly `sku`)

**Solution**:
1. Check CSV SKUs match image SKUs exactly
2. Ensure first row is header with `sku` column
3. Re-upload CSV after fixing

### Upload Fails

**Problem**: Some images show red error badge

**Causes**:
- Duplicate SKU already exists
- Image file corrupted
- Network error

**Solution**:
- Check error message on failed item
- Remove/rename duplicates
- Try uploading failed items individually

## Tips

1. **SKU Naming**: Keep SKUs simple and consistent (e.g., `BRAND-###`)
2. **Batch Size**: Upload 50-100 at a time for best performance
3. **CSV Prep**: Use Excel/Google Sheets, export as CSV UTF-8
4. **Image Quality**: High-res images work best for AI extraction later
5. **Test First**: Try 5-10 products first to verify your process

## Next Steps After Upload

Once uploaded, products will:
1. Appear in the product catalog sidebar
2. Have status `extraction_status: "pending"`
3. Be ready for AI garment extraction (coming soon)
4. Be usable in virtual try-on workflows

## Database Migration

To use the bulk uploader, run the new migration to make fields optional:

```bash
cd fashion-agent-dashboard
npm run db:push
```

This applies migration `003_make_fields_optional.sql` which allows uploading with just SKU + image.
