# Slanity: The GitHub Repository Roaster

**Tagline**: Spicing up GitHub repos with a dash of humor and critique!

## Introduction

Slanity is a fun and unique Next.js-based web application designed to "roast" GitHub repositories by analyzing their content and generating humorous, light-hearted critiques. Whether you're looking to poke fun at your own repo or get a witty breakdown of someone else's, Slanity brings a playful twist to code analysis. Our goal is to entertain while highlighting areas for improvement in a repository's structure, documentation, or code quality.

## Features

- **Humorous Roasts**: Generates witty and engaging critiques of GitHub repositories.
- **Repo Analysis**: Evaluates repository structure, README quality, and code organization.
- **Customizable Output**: Tailor the tone and depth of the roast with configuration options.
- **Web Interface**: User-friendly Next.js frontend for easy interaction.
- **Community-Driven**: Open to contributions for new roast styles and features.

## Installation

Follow these steps to set up Slanity locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/username/slanity.git
   cd slanity
   ```

2. **Install Dependencies**:
   Ensure you have [Node.js 18+](https://nodejs.org/) installed. Then, install the required packages:
   ```bash
   npm install
   ```

3. **Run the Development Server**:
   Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view Slanity.

## Usage

Slanity can be used via its web interface or API endpoints. Below are some examples:

- **Web Interface**:
  1. Navigate to [http://localhost:3000](http://localhost:3000) (or your deployed URL).
  2. Enter the URL of a GitHub repository (e.g., `https://github.com/username/repository`).
  3. Select a roast tone (e.g., Friendly, Sassy, Brutal) and click "Roast".
  4. View the generated roast on the page.

- **API Endpoint**:
  Make a POST request to the roast endpoint:
  ```bash
  curl -X POST http://localhost:3000/api/roast \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/username/repository", "tone": "friendly"}'
  ```
  The response will contain the generated roast.

For more API details, check the [API documentation](docs/api.md).

## Configuration

Slanity supports configuration via environment variables. Create a `.env.local` file in the project root to customize settings:

```env
NEXT_PUBLIC_ROAST_TONE=friendly
NEXT_PUBLIC_MAX_ROAST_LENGTH=500
NEXT_PUBLIC_GITHUB_API_TOKEN=your-github-token
```

- **NEXT_PUBLIC_ROAST_TONE**: Default roast tone (`friendly`, `sassy`, or `brutal`).
- **NEXT_PUBLIC_MAX_ROAST_LENGTH**: Maximum character length for roast output.
- **NEXT_PUBLIC_GITHUB_API_TOKEN**: GitHub token for accessing repository data (optional for public repos).

After updating `.env.local`, restart the development server:
```bash
npm run dev
```

## Contributing

We welcome contributions to make Slanity even more entertaining and robust! To contribute:

1. **Fork the Repository**:
   Fork the [Slanity repository](https://github.com/username/slanity) on GitHub.

2. **Set Up the Development Environment**:
   ```bash
   git clone https://github.com/your-username/slanity.git
   cd slanity
   npm install
   ```

3. **Coding Standards**:
   - Follow [JavaScript Standard Style](https://standardjs.com/) for code consistency.
   - Use TypeScript for type safety where applicable.
   - Write clear, concise commit messages.
   - Include tests for new features or bug fixes.

4. **Submit a Pull Request**:
   - Create a branch for your feature: `git checkout -b feature/your-feature-name`.
   - Push your changes and open a pull request against the `main` branch.
   - Ensure your PR includes a description of the changes and any relevant issues.

For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Slanity is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute the code as permitted by the license.

## Acknowledgements

Special thanks to the Next.js community, GitHub API, and all contributors who help make Slanity a fun and engaging tool!

## Contact/Support

Have questions or need help? Reach out to us:

- **GitHub Issues**: [Open an issue](https://github.com/username/slanity/issues) for bug reports or feature requests.
- **Email**: Contact us at support@slanity.dev.
- **Community**: Join our [Discord server](https://discord.gg/slanity) for discussions and updates.