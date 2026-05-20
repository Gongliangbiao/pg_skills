#!/usr/bin/env ruby

require 'yaml'

ROOT = File.expand_path('../references/pg_skills', __dir__).freeze
INDEX_PATH = File.join(ROOT, '_index.yaml')

ALIASES = {
  '事务隔离' => %w[transaction_isolation transaction isolation],
  '死锁' => %w[deadlock],
  'mvcc' => %w[mvcc],
  '行锁' => %w[row_locks row locks],
  '表锁' => %w[table_locks table locks],
  '咨询锁' => %w[advisory_locks advisory locks],
  '建议锁' => %w[advisory_locks advisory locks],
  '序列化失败' => %w[serialization_failure serialization failure],
  '锁索引' => %w[locking_indexes locking indexes]
}.freeze

def usage
  warn 'Usage: lookup_pg_doc.rb "<query>"'
  exit 1
end

def normalize(text)
  text.to_s.downcase.strip.gsub(/\s+/, ' ')
end

def tokenize(text)
  normalize(text).gsub(/[^a-z0-9_ ]+/, ' ').split.uniq
end

def flatten_entries(skills_list)
  entries = []

  skills_list.each do |category, value|
    if value.is_a?(Array)
      value.each do |item|
        entries << build_entry(category, nil, item)
      end
    elsif value.is_a?(Hash)
      value.each do |subcategory, items|
        Array(items).each do |item|
          entries << build_entry(category, subcategory, item)
        end
      end
    end
  end

  entries
end

def build_entry(category, subcategory, item)
  rel_file = item.fetch('file')
  {
    category: category.to_s,
    subcategory: subcategory&.to_s,
    skillid: item.fetch('skillid'),
    name: item.fetch('name'),
    rel_file: rel_file,
    abs_file: File.join(ROOT, rel_file),
    basename: File.basename(rel_file, '.yaml')
  }
end

def expand_query(query)
  expanded = [query]
  ALIASES.each do |needle, synonyms|
    expanded.concat(synonyms) if query.include?(needle)
  end
  expanded.join(' ')
end

def score_entry(entry, query, query_tokens)
  score = 0
  name = normalize(entry[:name])
  skillid = normalize(entry[:skillid])
  rel_file = normalize(entry[:rel_file])
  basename = normalize(entry[:basename])
  category = normalize(entry[:category])
  combined = [name, skillid, rel_file, basename, category].join(' ')

  score += 150 if query == name || query == skillid || query == basename
  score += 100 if name.include?(query) || basename.include?(query)
  score += 70 if query.include?(name)

  query_tokens.each do |token|
    next if token.length < 2

    score += 30 if name.split.include?(token)
    score += 18 if basename.split('_').include?(token)
    score += 12 if combined.include?(token)
  end

  if query.include?('锁') && category == 'concurrency'
    score += 25
  end

  if query.include?('for update') && entry[:rel_file] == 'concurrency/row_locks.yaml'
    score += 40
  end

  score
end

query = ARGV.join(' ').strip
usage if query.empty?

abort("Index file not found: #{INDEX_PATH}") unless File.exist?(INDEX_PATH)

index_data = YAML.safe_load(File.read(INDEX_PATH))
entries = flatten_entries(index_data.fetch('skills_list'))

expanded_query = normalize(expand_query(query))
query_tokens = tokenize(expanded_query)

matches = entries.map do |entry|
  [entry, score_entry(entry, expanded_query, query_tokens)]
end

matches.select! { |_entry, score| score.positive? }
matches.sort_by! { |entry, score| [-score, entry[:name]] }
matches = matches.first(8)

if matches.empty?
  warn "No matches found for: #{query}"
  exit 1
end

puts "Query: #{query}"
puts "Knowledge base: #{ROOT}"
puts
puts 'Top matches:'

matches.each_with_index do |(entry, score), index|
  line = "#{index + 1}. #{entry[:name]} [#{entry[:category]}"
  line += "/#{entry[:subcategory]}" if entry[:subcategory]
  line += "]"
  puts line
  puts "   score: #{score}"
  puts "   skillid: #{entry[:skillid]}"
  puts "   relative: #{entry[:rel_file]}"
  puts "   absolute: #{entry[:abs_file]}"
end
