New-Item -ItemType Directory -Force -Path "./lighthouse-reports"
$urls = "http://localhost:3000/", "http://localhost:3000/create", "http://localhost:3000/profile", "http://localhost:3000/history", "http://localhost:3000/settings", "http://localhost:3000/feedback", "http://localhost:3000/admin", "http://localhost:3000/admin/login", "http://localhost:3000/admin/questions", "http://localhost:3000/admin/users", "http://localhost:3000/admin/feedback", "http://localhost:3000/admin/security"
foreach ($url in $urls) {
  $name = $url.Replace("http://localhost:3000/", "").Replace("/", "-")
  if ($name -eq "") { $name = "home" }
  npx --yes lighthouse $url --output json --output-path "./lighthouse-reports/$name.json" --chrome-flags="--headless --no-sandbox"
}
