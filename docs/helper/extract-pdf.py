#!/usr/bin/env python3
"""
PDF to Markdown Extractor with Image Extraction

Usage:
    python extract-pdf.py <input_pdf> <output_md> [--img-dir <img_directory>]

Example:
    python extract-pdf.py docs/document.pdf docs/output.md --img-dir docs/img

This script extracts text and images from a PDF file, creating a markdown
file with embedded image references.

Requirements:
    pip install pdfplumber pillow
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import pdfplumber
    from PIL import Image
except ImportError:
    print("Error: Required packages not installed. Run: python -m pip install pdfplumber pillow")
    sys.exit(1)


def extract_pdf_to_markdown(pdf_path: str, output_md: str, img_dir: str = None) -> None:
    """Extract PDF content to markdown with images."""
    
    pdf_name = Path(pdf_path).stem
    
    # Set up image directory
    if img_dir:
        img_path = Path(img_dir)
        img_path.mkdir(parents=True, exist_ok=True)
    else:
        img_path = Path(output_md).parent / "img"
        img_path.mkdir(parents=True, exist_ok=True)
    
    markdown_content = []
    image_counter = 0
    page_count = 0
    
    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)
        
        for page_num, page in enumerate(pdf.pages, start=1):
            # Extract text
            text = page.extract_text()
            if text and text.strip():
                markdown_content.append(f"\n<!-- Page {page_num} -->\n")
                markdown_content.append(text + "\n")
            
            # Extract images
            if hasattr(page, 'images') and page.images:
                for img_index, img_info in enumerate(page.images):
                    try:
                        # Get image bounding box and extract
                        x0, top, x1, bottom = img_info['x0'], img_info['top'], img_info['x1'], img_info['bottom']
                        
                        # Crop the image from page
                        cropped = page.crop((x0, top, x1, bottom))
                        img = cropped.to_image(resolution=150)
                        
                        image_counter += 1
                        image_filename = f"{pdf_name}_page{page_num}_img{img_index + 1}.png"
                        image_filepath = img_path / image_filename
                        
                        img.save(str(image_filepath), format="PNG")
                        
                        # Add image reference to markdown
                        rel_img_path = os.path.relpath(image_filepath, Path(output_md).parent)
                        rel_img_path = rel_img_path.replace("\\", "/")  # Normalize for markdown
                        markdown_content.append(f"\n![Image {image_counter}]({rel_img_path})\n")
                        
                    except Exception as e:
                        print(f"Warning: Could not extract image {img_index + 1} from page {page_num}: {e}")
    
    # Write markdown file
    with open(output_md, "w", encoding="utf-8") as md_file:
        md_file.write("".join(markdown_content))
    
    print(f"Extracted {page_count} pages to {output_md}")
    print(f"Extracted {image_counter} images to {img_path}")


def main():
    parser = argparse.ArgumentParser(description="Extract PDF to Markdown with images")
    parser.add_argument("input_pdf", help="Input PDF file path")
    parser.add_argument("output_md", help="Output Markdown file path")
    parser.add_argument("--img-dir", help="Directory to store extracted images", default=None)
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_pdf):
        print(f"Error: PDF file not found: {args.input_pdf}")
        sys.exit(1)
    
    extract_pdf_to_markdown(args.input_pdf, args.output_md, args.img_dir)


if __name__ == "__main__":
    main()
