#!/usr/bin/env python3
"""
Split Markdown by Sections

Usage:
    python split-md-sections.py <input_md> <output_dir>

Splits a large markdown file into smaller files based on chapter/section headings.
"""

import argparse
import os
import re
import sys
from pathlib import Path
from datetime import datetime


def split_markdown_by_sections(input_path: str, output_dir: str) -> None:
    """Split markdown file into sections based on document structure."""
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create output directory
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    # Define section patterns and their file mappings
    sections = [
        # Front matter
        (r'<!-- Page 1 -->', r'(?=<!-- Page 5 -->)', '00-title-page.md', 'Title Page'),
        (r'<!-- Page 5 -->', r'(?=<!-- Page 6 -->)', '01-resumo-pt.md', 'Resumo (Portuguese Abstract)'),
        (r'<!-- Page 6 -->', r'(?=<!-- Page 7 -->)', '02-abstract-en.md', 'Abstract (English)'),
        (r'<!-- Page 7 -->', r'(?=<!-- Page 10 -->)', '03-list-of-figures.md', 'List of Figures'),
        (r'<!-- Page 10 -->', r'(?=<!-- Page 11 -->)', '04-list-of-tables.md', 'List of Tables'),
        (r'<!-- Page 11 -->', r'(?=<!-- Page 12 -->)', '05-list-of-charts.md', 'List of Charts'),
        (r'<!-- Page 12 -->', r'(?=<!-- Page 14 -->)', '06-acronyms.md', 'Acronyms and Abbreviations'),
        (r'<!-- Page 14 -->', r'(?=<!-- Page 17 -->)', '07-table-of-contents.md', 'Table of Contents'),
        
        # Chapter 1 - Introduction
        (r'<!-- Page 17 -->', r'(?=<!-- Page 26 -->)', '10-ch1-introduction.md', 'Chapter 1: Introduction'),
        
        # Chapter 2 - Theoretical Framework
        (r'<!-- Page 26 -->', r'(?=<!-- Page 54 -->)', '20-ch2-theoretical-framework.md', 'Chapter 2: Theoretical Framework'),
        
        # Chapter 3 - Problem-Based SRS Method
        (r'<!-- Page 54 -->', r'(?=<!-- Page 91 -->)', '30-ch3-problem-based-srs-method.md', 'Chapter 3: Problem-Based SRS Method'),
        
        # Chapter 4 - Case Study (CRM)
        (r'<!-- Page 91 -->', r'(?=<!-- Page 109 -->)', '40-ch4-case-study-crm.md', 'Chapter 4: Case Study - CRM Application'),
        
        # Chapter 5 - Experiment (MicroER)
        (r'<!-- Page 109 -->', r'(?=<!-- Page 125 -->)', '50-ch5-experiment-microer.md', 'Chapter 5: Experiment - MicroER'),
        
        # Chapter 6 - Final Considerations
        (r'<!-- Page 125 -->', r'(?=<!-- Page 130 -->)', '60-ch6-final-considerations.md', 'Chapter 6: Final Considerations'),
        
        # References
        (r'<!-- Page 130 -->', r'(?=<!-- Page 134 -->)', '70-references.md', 'References'),
        
        # Appendices
        (r'<!-- Page 134 -->', r'(?=<!-- Page 141 -->)', '80-appendix-a-ad-theorems.md', 'Appendix A: AD Corollaries and Theorems'),
        (r'<!-- Page 141 -->', r'(?=<!-- Page 147 -->)', '81-appendix-b-research-method.md', 'Appendix B: Bibliographic Research Method'),
        (r'<!-- Page 147 -->', r'$', '82-appendix-c-opd-notation.md', 'Appendix C: OPD Notation'),
    ]
    
    # Generate timestamp prefix
    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M%S')
    
    # Create index file
    index_content = f"""# Problem-Based SRS: Method for Software Requirements Specification

**Generated:** {timestamp}

**Original:** CT_PPGCA_M_Souza_Rafael_Gorski_Moreno_2016 (Master's Dissertation)

**Author:** Rafael Gorski Moreno Souza

**Advisor:** Prof. Dr. Paulo Cézar Stadzisz

**Institution:** Federal Technological University of Paraná (UTFPR)

**Year:** 2016

---

## Document Sections

"""
    
    files_created = []
    
    for start_pattern, end_pattern, filename, title in sections:
        try:
            # Find content between patterns
            pattern = f'({start_pattern}.*?){end_pattern}'
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                section_content = match.group(1)
                
                # Add header to section
                header = f"# {title}\n\n"
                header += f"*Part of: Problem-Based SRS Dissertation (2016)*\n\n---\n\n"
                
                full_content = header + section_content
                
                # Write section file
                section_path = out_path / filename
                with open(section_path, 'w', encoding='utf-8') as f:
                    f.write(full_content)
                
                files_created.append((filename, title))
                print(f"✓ Created {filename}")
            else:
                print(f"⚠ Section not found: {title}")
                
        except Exception as e:
            print(f"✗ Error processing {title}: {e}")
    
    # Complete index file
    for filename, title in files_created:
        index_content += f"- [{title}]({filename})\n"
    
    index_content += "\n---\n\n## Images\n\nAll images are stored in `../img/` and referenced from within each section.\n"
    
    # Write index
    index_path = out_path / "README.md"
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)
    
    print(f"\n✓ Created README.md (index)")
    print(f"\nTotal: {len(files_created) + 1} files created in {output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Split markdown into sections")
    parser.add_argument("input_md", help="Input Markdown file")
    parser.add_argument("output_dir", help="Output directory for split files")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_md):
        print(f"Error: File not found: {args.input_md}")
        sys.exit(1)
    
    split_markdown_by_sections(args.input_md, args.output_dir)


if __name__ == "__main__":
    main()
