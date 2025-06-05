/**
 * script.js
 * 
 * - Holds all default pricing values (frankfurt region baseline).
 * - Applies region‐based multipliers when the dropdown changes.
 * - Listens for manual edits in the Pricing table and updates the in‐memory `pricing` object.
 * - Contains the core `calculate()` function which:
 *     • Reads configuration (users, TPS, data volume, environment)
 *     • Applies sizing rules for EKS, Aurora, MongoDB, Redis, Kafka, etc.
 *     • Splits out fixed vs. variable costs
 *     • Updates the summary & detailed breakdown in the UI
 */

// ───────── Default Pricing (Baseline = eu-central-1) ─────────
let defaultPricing = {
  eks: {
    cluster: 73,
    nodeGroup: {
      small: 55,    // t3.large
      medium: 110,  // t3.xlarge
      large: 352    // c5.2xlarge
    }
  },
  aurora: {
    small: 330,     // db.t3.medium (monthly)
    medium: 660,    // db.t3.large (monthly)
    storage: 0.09   // per GB-month
  },
  mongodb: {
    m20: 205,       // per cluster-month
    m40: 880        // per cluster-month
  },
  redis: {
    small: 33,      // cache.t3.micro monthly
    multi: 66       // Multi-AZ monthly
  },
  kafka: {
    dev: 14,        // single broker (t3.small) monthly
    prod: 420       // 3×m5.large cluster monthly
  },
  thirdParty: {
    wso2_micro: 550,
    wso2_standard: 1833,
    auth0_essentials: 32,
    auth0_professional: 220,
    cloudflare_pro: 23,
    cloudflare_business: 184
  },
  alb: 18,          // single ALB monthly
  dataTransfer: 0.105 // per GB
};

// This `pricing` object will be mutated based on region + manual edits
let pricing = JSON.parse(JSON.stringify(defaultPricing));

// ───────── Region Multipliers ─────────
// Multiply default eu-central-1 prices by these factors for other regions
const regionMultipliers = {
  'eu-central-1': 1.00,    // baseline (Frankfurt)
  'us-east-1': 0.95,       // ~5% cheaper
  'eu-west-1': 1.02,       // ~2% more
  'ap-southeast-1': 1.08   // ~8% more
};

// Called when the page loads
window.onload = function() {
  // 1) Re‐calculate if region changes
  document.getElementById('awsRegion')
          .addEventListener('change', updateRegionPricing);

  // 2) Re‐calculate when “Calculate Cost” button is clicked
  document.getElementById('calculateBtn')
          .addEventListener('click', calculate);

  // 3) Listen for manual edits in Pricing table and push them into `pricing`
  document.querySelectorAll('.pricing-table input').forEach(input => {
    input.addEventListener('input', function() {
      const id = this.id;
      const newValue = parseFloat(this.value);

      switch (id) {
        // ─── EKS Pricing ─────────────────────────
        case 'price-eks-cluster':
          pricing.eks.cluster = newValue; break;
        case 'price-eks-node-small':
          pricing.eks.nodeGroup.small = newValue; break;
        case 'price-eks-node-medium':
          pricing.eks.nodeGroup.medium = newValue; break;
        case 'price-eks-node-large':
          pricing.eks.nodeGroup.large = newValue; break;

        // ─── Aurora Pricing ───────────────────────
        case 'price-aurora-small':
          pricing.aurora.small = newValue; break;
        case 'price-aurora-medium':
          pricing.aurora.medium = newValue; break;
        case 'price-aurora-storage':
          pricing.aurora.storage = newValue; break;

        // ─── MongoDB Pricing ──────────────────────
        case 'price-mongodb-m20':
          pricing.mongodb.m20 = newValue; break;
        case 'price-mongodb-m40':
          pricing.mongodb.m40 = newValue; break;

        // ─── Redis Pricing ────────────────────────
        case 'price-redis-small':
          pricing.redis.small = newValue; break;
        case 'price-redis-multi':
          pricing.redis.multi = newValue; break;

        // ─── Kafka Pricing ────────────────────────
        case 'price-kafka-dev':
          pricing.kafka.dev = newValue; break;
        case 'price-kafka-prod':
          pricing.kafka.prod = newValue; break;

        // ─── Third-Party Pricing ──────────────────
        case 'price-wso2-micro':
          pricing.thirdParty.wso2_micro = newValue; break;
        case 'price-wso2-standard':
          pricing.thirdParty.wso2_standard = newValue; break;
        case 'price-auth0-essentials':
          pricing.thirdParty.auth0_essentials = newValue; break;
        case 'price-auth0-professional':
          pricing.thirdParty.auth0_professional = newValue; break;
        case 'price-cloudflare-pro':
          pricing.thirdParty.cloudflare_pro = newValue; break;
        case 'price-cloudflare-business':
          pricing.thirdParty.cloudflare_business = newValue; break;

        // ─── ALB & Data Transfer ──────────────────
        case 'price-alb':
          pricing.alb = newValue; break;
        case 'price-data-transfer':
          pricing.dataTransfer = newValue; break;
      }

      // Re‐run the calculation so UI updates immediately
      calculate();
    });
  });

  // 4) Initialize pricing inputs based on default (eu-central-1)
  updateRegionPricing();
};

/**
 * updateRegionPricing()
 *  - Reads the selected AWS region
 *  - Applies the multiplier to all AWS-based prices in `pricing`
 *  - Leaves `thirdParty` prices untouched (they are global SaaS costs)
 *  - Updates all input fields to show the newly–multiplied values
 *  - Re‐runs `calculate()` so the UI summary is correct
 */
function updateRegionPricing() {
  const region = document.getElementById('awsRegion').value;
  const mult   = regionMultipliers[region] || 1.00;

  // Recalculate each AWS-based price = defaultPrice × multiplier
  pricing.eks.cluster               = defaultPricing.eks.cluster * mult;
  pricing.eks.nodeGroup.small       = defaultPricing.eks.nodeGroup.small * mult;
  pricing.eks.nodeGroup.medium      = defaultPricing.eks.nodeGroup.medium * mult;
  pricing.eks.nodeGroup.large       = defaultPricing.eks.nodeGroup.large * mult;
  pricing.aurora.small              = defaultPricing.aurora.small * mult;
  pricing.aurora.medium             = defaultPricing.aurora.medium * mult;
  pricing.aurora.storage            = defaultPricing.aurora.storage * mult;
  pricing.mongodb.m20               = defaultPricing.mongodb.m20 * mult;
  pricing.mongodb.m40               = defaultPricing.mongodb.m40 * mult;
  pricing.redis.small               = defaultPricing.redis.small * mult;
  pricing.redis.multi               = defaultPricing.redis.multi * mult;
  pricing.kafka.dev                 = defaultPricing.kafka.dev * mult;
  pricing.kafka.prod                = defaultPricing.kafka.prod * mult;
  pricing.alb                       = defaultPricing.alb * mult;
  pricing.dataTransfer              = defaultPricing.dataTransfer * mult;

  // Reflect the updated values in the Pricing Data inputs
  updatePricingInputs();

  // Re‐calculate totals after region change
  calculate();
}

/**
 * updatePricingInputs()
 *  - Copies current values from `pricing` into each input on the Pricing table
 */
function updatePricingInputs() {
  document.getElementById('price-eks-cluster').value     = pricing.eks.cluster.toFixed(2);
  document.getElementById('price-eks-node-small').value  = pricing.eks.nodeGroup.small.toFixed(2);
  document.getElementById('price-eks-node-medium').value = pricing.eks.nodeGroup.medium.toFixed(2);
  document.getElementById('price-eks-node-large').value  = pricing.eks.nodeGroup.large.toFixed(2);

  document.getElementById('price-aurora-small').value    = pricing.aurora.small.toFixed(2);
  document.getElementById('price-aurora-medium').value   = pricing.aurora.medium.toFixed(2);
  document.getElementById('price-aurora-storage').value  = pricing.aurora.storage.toFixed(3);

  document.getElementById('price-mongodb-m20').value     = pricing.mongodb.m20.toFixed(2);
  document.getElementById('price-mongodb-m40').value     = pricing.mongodb.m40.toFixed(2);

  document.getElementById('price-redis-small').value     = pricing.redis.small.toFixed(2);
  document.getElementById('price-redis-multi').value     = pricing.redis.multi.toFixed(2);

  document.getElementById('price-kafka-dev').value       = pricing.kafka.dev.toFixed(2);
  document.getElementById('price-kafka-prod').value      = pricing.kafka.prod.toFixed(2);

  document.getElementById('price-wso2-micro').value       = pricing.thirdParty.wso2_micro.toFixed(2);
  document.getElementById('price-wso2-standard').value    = pricing.thirdParty.wso2_standard.toFixed(2);
  document.getElementById('price-auth0-essentials').value = pricing.thirdParty.auth0_essentials.toFixed(2);
  document.getElementById('price-auth0-professional').value = pricing.thirdParty.auth0_professional.toFixed(2);
  document.getElementById('price-cloudflare-pro').value   = pricing.thirdParty.cloudflare_pro.toFixed(2);
  document.getElementById('price-cloudflare-business').value = pricing.thirdParty.cloudflare_business.toFixed(2);

  document.getElementById('price-alb').value              = pricing.alb.toFixed(2);
  document.getElementById('price-data-transfer').value    = pricing.dataTransfer.toFixed(3);
}

/**
 * calculate()
 *  - Reads user inputs (Daily Users, Peak TPS, Data Volume, Environment).
 *  - Applies sizing rules to determine:
 *       • How many EKS nodes (and what size) are needed
 *       • How many Aurora instances and storage cost
 *       • Which MongoDB Atlas tier
 *       • Whether Redis uses single or Multi-AZ
 *       • Kafka cluster cost (dev vs prod)
 *       • Data transfer cost
 *  - Splits costs into:
 *       • Fixed Costs (third-party SaaS + ALB)
 *       • Variable AWS Costs (EKS, DB, storage, network, etc.)
 *  - Updates the “Cost Summary” and the “Detailed Breakdown” in the UI
 */
function calculate() {
  // 1) Grab all config inputs
  const dailyUsers = parseInt(document.getElementById('dailyUsers').value) || 0;
  const peakTPS    = parseInt(document.getElementById('peakTPS').value)    || 0;
  const dataVolume = parseFloat(document.getElementById('dataVolume').value) || 0;
  const envType    = document.getElementById('envType').value;

  // ──────── EKS Sizing ─────────────────────────────────
  // Decide tier: small=≤1k TPS, medium=≤5k, large=>5k
  let nodeTier;
  if (peakTPS <= 1000)        nodeTier = 'small';
  else if (peakTPS <= 5000)   nodeTier = 'medium';
  else                         nodeTier = 'large';

  // Decide node count: at least 1, else ceil(TPS ÷ capacity)
  let capacityPerNode = nodeTier === 'small' ? 1000
                       : nodeTier === 'medium' ? 2000
                       : 5000;
  let nodeCount = peakTPS > 0 ? Math.ceil(peakTPS / capacityPerNode) : 1;
  nodeCount = Math.max(nodeCount, 1);

  const eksClusterCost = pricing.eks.cluster;                       // always 1 cluster
  const eksNodesCost   = nodeCount * pricing.eks.nodeGroup[nodeTier];

  // ──────── Aurora Sizing ────────────────────────────────
  // If ≤5k daily users → one small; else number of mediums
  let auroraCost = 0;
  if (dailyUsers <= 5000) {
    auroraCost = pricing.aurora.small;
  } else {
    // One medium per 10k users
    let mediumCount = Math.max(Math.ceil(dailyUsers / 10000), 1);
    auroraCost = mediumCount * pricing.aurora.medium;
  }
  const auroraStorageCost = dataVolume * pricing.aurora.storage;

  // ──────── MongoDB Sizing ───────────────────────────────
  // ≤ 500 GB → M20; > 500 GB → M40
  const mongoCost = dataVolume <= 500
    ? pricing.mongodb.m20
    : pricing.mongodb.m40;

  // ──────── Redis Sizing ────────────────────────────────
  // ≤ 5k daily users → single node; else Multi-AZ
  const redisCost = dailyUsers <= 5000
    ? pricing.redis.small
    : pricing.redis.multi;

  // ──────── Kafka Cost ─────────────────────────────────
  // dev/test get “dev” price, stage/prod get “prod” price
  const kafkaCost = (envType === 'dev' || envType === 'test')
    ? pricing.kafka.dev
    : pricing.kafka.prod;

  // ──────── Network Data Transfer ───────────────────────
  const dataTransferCost = dataVolume * pricing.dataTransfer;

  // ──────── Load Balancer (ALB) ──────────────────────────
  const albCost = pricing.alb;

  // ──────── Third-Party Fixed Costs ─────────────────────
  // We assume “standard” tier for WSO2, “essentials” for Auth0, “pro” for Cloudflare
  const wso2Cost = pricing.thirdParty.wso2_standard;
  const auth0Cost = pricing.thirdParty.auth0_essentials;
  const cfCost = pricing.thirdParty.cloudflare_pro;

  // ──────── Summation ───────────────────────────────────
  const fixedCost = wso2Cost + auth0Cost + cfCost + albCost;
  const variableAwsCost = (
    eksClusterCost +
    eksNodesCost +
    auroraCost +
    auroraStorageCost +
    mongoCost +
    redisCost +
    kafkaCost +
    dataTransferCost
  );
  const totalCost = fixedCost + variableAwsCost;

  // ──────── Update Cost Summary in UI ───────────────────
  document.getElementById('fixedCost').innerText    = `€${fixedCost.toFixed(2)}`;
  document.getElementById('variableCost').innerText = `€${variableAwsCost.toFixed(2)}`;
  document.getElementById('totalCost').innerText    = `€${totalCost.toFixed(2)}`;

  // ──────── Detailed Breakdown ─────────────────────────
  let breakdown = '';
  breakdown += `• EKS Cluster (1 cluster): €${eksClusterCost.toFixed(2)}\n`;
  breakdown += `• EKS Nodes (${nodeCount} × ${nodeTier}): €${eksNodesCost.toFixed(2)}\n`;
  breakdown += `• Aurora Instance(s): €${auroraCost.toFixed(2)}\n`;
  breakdown += `• Aurora Storage (${dataVolume} GB): €${auroraStorageCost.toFixed(2)}\n`;
  breakdown += `• MongoDB Atlas: €${mongoCost.toFixed(2)}\n`;
  breakdown += `• Redis: €${redisCost.toFixed(2)}\n`;
  breakdown += `• Kafka (MSK): €${kafkaCost.toFixed(2)}\n`;
  breakdown += `• Data Transfer (${dataVolume} GB): €${dataTransferCost.toFixed(2)}\n`;
  breakdown += `• Load Balancer (ALB): €${albCost.toFixed(2)}\n`;
  breakdown += `• WSO2 API Manager: €${wso2Cost.toFixed(2)}\n`;
  breakdown += `• Auth0 Essentials: €${auth0Cost.toFixed(2)}\n`;
  breakdown += `• Cloudflare Pro: €${cfCost.toFixed(2)}\n`;
  breakdown += `----------------------------------------------\n`;
  breakdown += `Fixed Cost Total: €${fixedCost.toFixed(2)}\n`;
  breakdown += `AWS Variable Cost Total: €${variableAwsCost.toFixed(2)}\n`;
  breakdown += `\nOverall Total Cost: €${totalCost.toFixed(2)}\n`;

  document.getElementById('detailedBreakdown').innerText = breakdown;
}
