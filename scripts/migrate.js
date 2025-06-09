const { spawn } = require("child_process");

async function runMigration() {
  console.log("🚀 Running database migrations...");

  const migrate = spawn("npx", ["drizzle-kit", "push"], {
    stdio: "inherit",
    shell: true,
  });

  migrate.on("close", (code) => {
    if (code === 0) {
      console.log("✅ Database migration completed successfully");
    } else {
      console.log(`❌ Migration failed with code ${code}`);
      process.exit(code);
    }
  });
}

runMigration();
