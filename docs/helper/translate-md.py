#!/usr/bin/env python3
"""
Markdown Translator (Portuguese to English)

Usage:
    python translate-md.py <input_md> <output_md>

Example:
    python translate-md.py docs/document_PT.md docs/document_EN.md

This script translates a markdown file from Portuguese to English
while preserving markdown formatting, image references, and comments.

Requirements:
    pip install deep_translator
"""

import argparse
import os
import re
import sys
from pathlib import Path

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("Error: deep_translator not installed. Run: python -m pip install deep_translator")
    sys.exit(1)


def translate_text(text: str, translator: GoogleTranslator) -> str:
    """Translate text while preserving markdown elements."""
    if not text.strip():
        return text
    
    # Skip lines that are only page markers, images, or page numbers
    if re.match(r'^<!--.*-->$', text.strip()):
        return text
    if re.match(r'^\!\[.*\]\(.*\)$', text.strip()):
        return text
    if re.match(r'^\d+$', text.strip()):
        return text
    
    try:
        # Translate in chunks of max 4500 chars to stay within API limits
        if len(text) > 4500:
            chunks = []
            current_chunk = ""
            for line in text.split('\n'):
                if len(current_chunk) + len(line) + 1 > 4500:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = line
                else:
                    current_chunk += ('\n' if current_chunk else '') + line
            if current_chunk:
                chunks.append(current_chunk)
            
            translated_chunks = []
            for chunk in chunks:
                translated = translator.translate(chunk)
                translated_chunks.append(translated if translated else chunk)
            return '\n'.join(translated_chunks)
        else:
            translated = translator.translate(text)
            return translated if translated else text
    except Exception as e:
        print(f"Warning: Translation failed for chunk: {e}")
        return text


def translate_markdown_file(input_path: str, output_path: str) -> None:
    """Translate a markdown file from Portuguese to English."""
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    translator = GoogleTranslator(source='pt', target='en')
    
    # Split by page markers to process page by page
    pages = re.split(r'(<!-- Page \d+ -->)', content)
    
    translated_parts = []
    total_pages = len([p for p in pages if p.startswith('<!-- Page')])
    page_count = 0
    
    for i, part in enumerate(pages):
        if part.startswith('<!-- Page'):
            page_count += 1
            print(f"Translating page {page_count}/{total_pages}...")
            translated_parts.append(part)
        elif part.strip():
            # Preserve image references exactly as they are
            lines = part.split('\n')
            translated_lines = []
            
            text_buffer = []
            for line in lines:
                # Keep image references, empty lines, and page numbers unchanged
                if re.match(r'^\s*\!\[.*\]\(.*\)\s*$', line):
                    # Flush text buffer
                    if text_buffer:
                        text_to_translate = '\n'.join(text_buffer)
                        translated = translate_text(text_to_translate, translator)
                        translated_lines.append(translated)
                        text_buffer = []
                    translated_lines.append(line)
                elif re.match(r'^\s*\d+\s*$', line.strip()) and len(line.strip()) <= 4:
                    # Page numbers - keep as is
                    if text_buffer:
                        text_to_translate = '\n'.join(text_buffer)
                        translated = translate_text(text_to_translate, translator)
                        translated_lines.append(translated)
                        text_buffer = []
                    translated_lines.append(line)
                elif not line.strip():
                    if text_buffer:
                        text_to_translate = '\n'.join(text_buffer)
                        translated = translate_text(text_to_translate, translator)
                        translated_lines.append(translated)
                        text_buffer = []
                    translated_lines.append(line)
                else:
                    text_buffer.append(line)
            
            # Flush remaining buffer
            if text_buffer:
                text_to_translate = '\n'.join(text_buffer)
                translated = translate_text(text_to_translate, translator)
                translated_lines.append(translated)
            
            translated_parts.append('\n'.join(translated_lines))
        else:
            translated_parts.append(part)
    
    translated_content = ''.join(translated_parts)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(translated_content)
    
    print(f"Translation complete: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Translate Markdown from Portuguese to English")
    parser.add_argument("input_md", help="Input Markdown file path (Portuguese)")
    parser.add_argument("output_md", help="Output Markdown file path (English)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_md):
        print(f"Error: File not found: {args.input_md}")
        sys.exit(1)
    
    translate_markdown_file(args.input_md, args.output_md)


if __name__ == "__main__":
    main()
