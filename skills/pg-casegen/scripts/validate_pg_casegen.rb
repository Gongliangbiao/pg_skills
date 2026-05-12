#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'

ROOT = File.expand_path('..', __dir__)

REQUIRED_FILES = [
  'SKILL.md',
  'agents/openai.yaml',
  'references/workflow.md',
  'references/intent-expansion.md',
  'references/coverage-pack-contract.md',
  'references/output-profile-contract.md',
  'references/pg-regression-sql-standards.md',
  'references/pg-sql-integration.md',
  'references/coverage-plan-template.md',
  'references/ab-sync-contract.md',
  'output-profiles/pg-regression.md',
  'output-profiles/pg-ab-regression.md',
  'coverage-packs/index.md',
  'coverage-packs/data-types.md',
  'coverage-packs/isolation-repeatable-read.md'
].freeze

REQUIRED_DIRS = [
  'agents',
  'references',
  'coverage-packs',
  'output-profiles',
  'scripts'
].freeze

COVERAGE_PACK_SECTIONS = [
  '## Pack ID',
  '## 触发短语',
  '## 需要查询 pg-sql',
  '## 能力要求',
  '## 覆盖维度',
  '## 用例生成规则',
  '## 不覆盖范围'
].freeze

OUTPUT_PROFILE_SECTIONS = [
  '## Profile ID',
  '## 适用场景',
  '## 生成文件',
  '## Header 格式'
].freeze

PUBLISH_BLOCK_PATTERNS = {
  'hard-coded user path' => %r{/(?:Users|home)/[^\s/]+|pg\u{6587}\u{6863}},
  'macOS metadata' => /\.DS_Store/,
  'unfinished placeholder' => /\bTODO\b|\bTBD\b|Pending Project-Specific/,
  'mandatory BUGID filename pattern' => /<BUGID>|<topic>_<BUGID>|bugid_lower|BUGXXXXXXXX/
}.freeze

MYSQL_ONLY_PATTERNS = {
  'sql_mode' => /\bsql_mode\b/i,
  '@@ variable syntax' => /@@[a-z_]+/i,
  'SHOW CREATE' => /\bshow\s+create\b/i,
  'REPLACE INTO' => /\breplace\s+into\b/i,
  'LOW_PRIORITY' => /\bLOW_PRIORITY\b/i,
  'QUICK' => /\bQUICK\b/i,
  'IGNORE modifier' => /\bINSERT\s+IGNORE\b|\bDELETE\s+.*\bIGNORE\b/i,
  'ZEROFILL' => /\bZEROFILL\b/i,
  'COLUMN_FORMAT' => /\bCOLUMN_FORMAT\b/i,
  'STORAGE option' => /\bSTORAGE\s+(DISK|MEMORY)\b/i,
  'MySQL transaction isolation variable' => /@@transaction_isolation/i
}.freeze

ALLOWED_MYSQL_CONTEXTS = [
  /转换规则/,
  /MySQL-only/,
  /MySQL 风格参考用例/,
  /从 MySQL 风格/
].freeze

def rel(path)
  path.sub("#{ROOT}/", '')
end

def all_files
  Dir.glob(File.join(ROOT, '**', '*'), File::FNM_DOTMATCH)
     .select { |path| File.file?(path) }
     .reject { |path| path.include?('/.git/') }
end

def content_files
  all_files.reject { |path| rel(path) == 'scripts/validate_pg_casegen.rb' }
end

def markdown_files
  all_files.select { |path| File.extname(path) == '.md' }
end

def add_error(errors, message)
  errors << "ERROR: #{message}"
end

def add_warning(warnings, message)
  warnings << "WARN: #{message}"
end

def read(path)
  File.read(path)
end

def check_required_structure(errors)
  REQUIRED_DIRS.each do |dir|
    path = File.join(ROOT, dir)
    add_error(errors, "missing required directory: #{dir}") unless Dir.exist?(path)
  end

  REQUIRED_FILES.each do |file|
    path = File.join(ROOT, file)
    add_error(errors, "missing required file: #{file}") unless File.file?(path)
  end
end

def parse_skill_frontmatter(errors)
  path = File.join(ROOT, 'SKILL.md')
  return unless File.file?(path)

  content = read(path)
  frontmatter = content[/\A---\n(.*?)\n---/m, 1]
  return add_error(errors, 'SKILL.md missing YAML frontmatter') unless frontmatter

  data = YAML.safe_load(frontmatter)
  add_error(errors, 'SKILL.md frontmatter missing name') unless data.is_a?(Hash) && data['name']
  add_error(errors, 'SKILL.md frontmatter missing description') unless data.is_a?(Hash) && data['description']
rescue Psych::SyntaxError => e
  add_error(errors, "SKILL.md frontmatter YAML parse failed: #{e.message}")
end

def parse_openai_yaml(errors)
  path = File.join(ROOT, 'agents/openai.yaml')
  return unless File.file?(path)

  data = YAML.safe_load(read(path))
  interface = data.is_a?(Hash) ? data['interface'] : nil
  add_error(errors, 'agents/openai.yaml missing interface.display_name') unless interface&.dig('display_name')
  add_error(errors, 'agents/openai.yaml missing interface.short_description') unless interface&.dig('short_description')
  add_error(errors, 'agents/openai.yaml missing interface.default_prompt') unless interface&.dig('default_prompt')
rescue Psych::SyntaxError => e
  add_error(errors, "agents/openai.yaml parse failed: #{e.message}")
end

def check_sections(errors)
  Dir.glob(File.join(ROOT, 'coverage-packs/*.md')).each do |path|
    content = read(path)
    COVERAGE_PACK_SECTIONS.each do |section|
      add_error(errors, "#{rel(path)} missing section #{section}") unless content.include?(section)
    end
  end

  Dir.glob(File.join(ROOT, 'output-profiles/*.md')).each do |path|
    content = read(path)
    OUTPUT_PROFILE_SECTIONS.each do |section|
      add_error(errors, "#{rel(path)} missing section #{section}") unless content.include?(section)
    end
  end
end

def check_publish_blockers(errors)
  content_files.each do |path|
    if File.basename(path) == '.DS_Store'
      add_error(errors, "macOS metadata file present: #{rel(path)}")
      next
    end

    content = read(path)
    PUBLISH_BLOCK_PATTERNS.each do |label, pattern|
      next unless content.match?(pattern)

      add_error(errors, "#{rel(path)} contains #{label}")
    end
  end
end

def allowed_mysql_line?(content, index)
  start_index = [index - 8, 0].max
  context = content[start_index..index].join("\n")
  ALLOWED_MYSQL_CONTEXTS.any? { |pattern| context.match?(pattern) }
end

def check_mysql_residue(errors, warnings)
  markdown_files.each do |path|
    lines = read(path).lines

    lines.each_with_index do |line, index|
      MYSQL_ONLY_PATTERNS.each do |label, pattern|
        next unless line.match?(pattern)

        if allowed_mysql_line?(lines, index)
          add_warning(warnings, "#{rel(path)}:#{index + 1} keeps MySQL term in conversion context: #{label}")
        else
          add_error(errors, "#{rel(path)}:#{index + 1} contains MySQL-only syntax outside conversion context: #{label}")
        end
      end
    end
  end
end

def check_references(errors)
  required_refs = [
    'references/workflow.md',
    'references/intent-expansion.md',
    'references/coverage-pack-contract.md',
    'references/output-profile-contract.md',
    'references/pg-sql-integration.md',
    'references/coverage-plan-template.md',
    'references/ab-sync-contract.md'
  ]

  skill = File.join(ROOT, 'SKILL.md')
  return unless File.file?(skill)

  content = read(skill)
  required_refs.each do |ref|
    add_error(errors, "SKILL.md does not reference #{ref}") unless content.include?(ref)
  end
end

errors = []
warnings = []

check_required_structure(errors)
parse_skill_frontmatter(errors)
parse_openai_yaml(errors)
check_sections(errors)
check_publish_blockers(errors)
check_mysql_residue(errors, warnings)
check_references(errors)

puts "pg-casegen validation"
puts "root: #{ROOT}"
puts "files: #{all_files.size}"
puts "errors: #{errors.size}"
puts "warnings: #{warnings.size}"

warnings.each { |warning| puts warning }
errors.each { |error| puts error }

exit(errors.empty? ? 0 : 1)
