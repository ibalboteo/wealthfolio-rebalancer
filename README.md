# Rebalancer

> Keep your portfolio aligned with your investment goals.

An unofficial Wealthfolio plugin that analyzes your portfolio and suggests the exact transfers needed to maintain your target asset allocations.

## Description

Rebalancer helps you maintain optimal portfolio balance by calculating precise rebalancing recommendations. Instead of guessing which assets to buy or sell, get data-driven suggestions that keep your investments aligned with your strategic allocation targets.

**Important:** Rebalancer is an analysis and recommendation tool only. It does not execute trades, transfers, or any financial transactions.

## Key Features

- **Smart Analysis**: Automatically calculates deviations from target allocations
- **Transfer Recommendations**: Suggests exact amounts to buy, sell, or transfer
- **Multi-Account Support**: Works across different account types and brokerages
- **Visual Planning**: Clear interface showing current vs. target allocations
- **Zero Risk**: Read-only analysis with no trading capabilities
- **Wealthfolio Integration**: Seamless sidebar integration with your existing workflow

## Installation

### Prerequisites

- Wealthfolio application installed
- Plugin system enabled in Wealthfolio settings

### Install Plugin

1. Download the latest release from the [releases page](../../releases)
2. Extract the ZIP file to your Wealthfolio plugins directory
3. Restart Wealthfolio
4. Enable the Rebalancer plugin in Settings > Plugins

### Alternative: Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rebalancer.git
cd rebalancer

# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Package for installation
pnpm bundle
```

## Usage

1. **Open Rebalancer**: Navigate to the Rebalancer section in your Wealthfolio sidebar
2. **Select Accounts**: Choose which accounts to include in the analysis
3. **Set Targets**: Define your desired asset allocation percentages
4. **Analyze**: Review current allocations vs. targets
5. **Get Recommendations**: View suggested transfers to rebalance your portfolio
6. **Execute Manually**: Use the recommendations to make trades in your brokerage accounts

### Example Workflow

```
Current Portfolio: 70% Stocks, 30% Bonds
Target Allocation: 60% Stocks, 40% Bonds
→ Rebalancer suggests: Transfer $5,000 from Stock ETF to Bond ETF
```

## Limitations & Disclaimer

- **Unofficial Plugin**: Not developed or endorsed by the Wealthfolio team
- **Analysis Only**: Does not execute trades or connect to brokerage accounts
- **Manual Execution Required**: You must manually implement suggested changes
- **No Financial Advice**: Recommendations are mathematical calculations, not investment advice
- **Data Accuracy**: Results depend on accurate portfolio data in Wealthfolio

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev:server

# Run in watch mode
pnpm dev
```

### Commands

```bash
# Build for production
pnpm build

# Run linting and formatting
pnpm check

# Run tests
pnpm test

# Package for distribution
pnpm bundle
```

### Tech Stack

- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Code Quality**: Biome (linting + formatting)
- **Testing**: Vitest
- **Git Hooks**: Lefthook

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

---

**Disclaimer**: This plugin is not affiliated with Wealthfolio. Use at your own risk and always verify recommendations before executing trades.
