// Sample email fixtures for testing the Reactive Maintenance module
// These represent common CRE maintenance scenarios

export interface SampleEmailMetadata {
  id: string;
  subject: string;
  property: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  from: string;
}

export interface SampleEmail {
  metadata: SampleEmailMetadata;
  body: string;
}

export const SAMPLE_EMAILS_LIST: SampleEmail[] = [
  {
    metadata: {
      id: 'roofLeak',
      subject: 'Urgent - Roof leak in produce section',
      property: 'Willow Creek Shopping Center',
      category: 'ROOFING',
      priority: 'HIGH',
      from: 'maria.santos@anchorgrocery.com',
    },
    body: `From: maria.santos@anchorgrocery.com
To: maintenance@willowcreek-mgmt.com
Subject: Urgent - Roof leak in produce section

Hi Property Management Team,

We have a serious issue at our Anchor Grocery store at Willow Creek Shopping Center, Suite 120.

This morning around 7:30 AM, one of our employees discovered water dripping from the ceiling in the produce section near the back of the store. It appears to be coming from the roof. The leak is getting worse as it's been raining since last night.

We've placed buckets under the drip and moved the produce displays, but water is now spreading across the floor in that area. This is near the refrigeration units which is concerning. We're worried about:
1. Customer safety (slippery floor)
2. Potential damage to our refrigeration equipment
3. Lost inventory if this continues

Our store hours are 7am to 10pm. For after-hours access, maintenance can use the rear service corridor entrance - the code is 4521.

Please send someone as soon as possible. This is affecting our sales floor and we may need to rope off that section if it gets worse.

Thank you,
Maria Santos
Store Manager
Anchor Grocery - Store #AG-4521
(217) 555-0120`,
  },
  {
    metadata: {
      id: 'electricalEmergency',
      subject: 'EMERGENCY - Electrical burning smell on 3rd floor',
      property: 'Metro Office Tower',
      category: 'ELECTRICAL',
      priority: 'EMERGENCY',
      from: 'david.kim@techstart.io',
    },
    body: `From: david.kim@techstart.io
To: facilities@metrotower.com
Subject: EMERGENCY - Electrical burning smell on 3rd floor

URGENT!

This is David Kim from TechStart Solutions on the 3rd Floor East Wing at Metro Office Tower.

We are experiencing a burning electrical smell coming from the server room area. It started about 15 minutes ago and is getting stronger. No visible smoke yet but the smell is very concerning.

We have:
- Evacuated our employees from the immediate area
- Unplugged all non-essential equipment
- Called building security

We need an electrician here IMMEDIATELY. This could be a fire hazard.

I'm staying on-site to monitor. Please call me directly at 312-555-0300.

David Kim
CEO, TechStart Solutions
Suite 1500, Metro Office Tower`,
  },
  {
    metadata: {
      id: 'hvacComfort',
      subject: 'AC not working properly - getting complaints',
      property: 'Willow Creek Shopping Center',
      category: 'HVAC',
      priority: 'MEDIUM',
      from: 'jwalsh@fitlifegym.com',
    },
    body: `From: jwalsh@fitlifegym.com
To: maintenance@willowcreek-mgmt.com
Subject: AC not working properly - getting complaints

Hello,

Jennifer Walsh here from FitLife Gym at Suite 105, Willow Creek Shopping Center.

Our air conditioning doesn't seem to be working correctly. The gym floor area is getting very warm, and we're starting to get member complaints. The thermostat shows 78 degrees but it's set to 68.

This has been going on for about two days now. The gym is 24/7 so access is never an issue, but please try to schedule the technician during off-peak hours if possible - before 6am or after 9pm would be ideal.

It's not an emergency but our members are uncomfortable, especially during peak workout times.

Thanks,
Jennifer Walsh
General Manager
FitLife Gym
(217) 555-0105`,
  },
  {
    metadata: {
      id: 'lightOut',
      subject: 'Parking lot light out in Bay 4 area',
      property: 'Gateway Industrial Park',
      category: 'ELECTRICAL',
      priority: 'LOW',
      from: 'security@gatewayindustrial.com',
    },
    body: `From: security@gatewayindustrial.com
To: property.manager@gatewayindustrial.com
Subject: Parking lot light out in Bay 4 area

Hi Property Management,

During our nightly rounds, security noticed that one of the parking lot lights near Bay 4 at Gateway Industrial Park is out. It's the third light from the loading dock entrance.

Not urgent, but wanted to report it since it does make that corner of the lot a bit dark. GlobalLog mentioned they'd prefer it fixed before winter when it gets dark earlier.

Can this be added to the maintenance queue?

Thanks,
Gateway Security Team`,
  },
  {
    metadata: {
      id: 'gasLeak',
      subject: 'EMERGENCY - Gas smell at restaurant Suite 210',
      property: 'Willow Creek Shopping Center',
      category: 'LIFE_SAFETY',
      priority: 'EMERGENCY',
      from: 'operations@cdfrestaurantgroup.com',
    },
    body: `From: operations@cdfrestaurantgroup.com
To: emergency@willowcreek-mgmt.com
Subject: EMERGENCY - Gas smell at restaurant Suite 210

IMMEDIATE ATTENTION REQUIRED

We have detected a strong gas smell at our restaurant location in Suite 210, Willow Creek Shopping Center.

Actions taken:
- Evacuated all staff and customers
- Shut off gas valve at meter
- Called 911 - fire department is en route
- Cleared the immediate area outside the suite

Please send emergency maintenance and notify adjacent tenants. Gas company has also been contacted.

Contact: Tom Richards, Operations Manager
Phone: 555-0210 (calling from parking lot)

THIS IS AN EMERGENCY`,
  },
  {
    metadata: {
      id: 'plumbingClog',
      subject: 'Clogged sink in break room',
      property: 'Metro Office Tower',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      from: 'admin@lawofficesofsmith.com',
    },
    body: `From: admin@lawofficesofsmith.com
To: building.services@metrotower.com
Subject: Clogged sink in break room

Hi Building Services,

We have a clogged sink in our break room at Suite 1500, Metro Office Tower (15th floor).

The sink is draining very slowly and starting to smell. It's been like this for a couple days. We've tried plunging but no luck.

Not an emergency but would appreciate if someone could take a look when convenient. We're in the office M-F, 8am-6pm.

Thank you,
Susan Anderson
Office Administrator
Law Offices of Smith & Partners`,
  },
];

// Legacy exports for backwards compatibility
export const SAMPLE_EMAILS = {
  // High priority roof leak at retail center
  roofLeak: `From: maria.santos@anchorgrocery.com
To: maintenance@willowcreek-mgmt.com
Subject: Urgent - Roof leak in produce section

Hi Property Management Team,

We have a serious issue at our Anchor Grocery store at Willow Creek Shopping Center, Suite 120.

This morning around 7:30 AM, one of our employees discovered water dripping from the ceiling in the produce section near the back of the store. It appears to be coming from the roof. The leak is getting worse as it's been raining since last night.

We've placed buckets under the drip and moved the produce displays, but water is now spreading across the floor in that area. This is near the refrigeration units which is concerning. We're worried about:
1. Customer safety (slippery floor)
2. Potential damage to our refrigeration equipment
3. Lost inventory if this continues

Our store hours are 7am to 10pm. For after-hours access, maintenance can use the rear service corridor entrance - the code is 4521.

Please send someone as soon as possible. This is affecting our sales floor and we may need to rope off that section if it gets worse.

Thank you,
Maria Santos
Store Manager
Anchor Grocery - Store #AG-4521
(217) 555-0120`,

  // Emergency - electrical burning smell at office
  electricalEmergency: `From: david.kim@techstart.io
To: facilities@metrotower.com
Subject: EMERGENCY - Electrical burning smell on 3rd floor

URGENT!

This is David Kim from TechStart Solutions on the 3rd Floor East Wing at Metro Office Tower.

We are experiencing a burning electrical smell coming from the server room area. It started about 15 minutes ago and is getting stronger. No visible smoke yet but the smell is very concerning.

We have:
- Evacuated our employees from the immediate area
- Unplugged all non-essential equipment
- Called building security

We need an electrician here IMMEDIATELY. This could be a fire hazard.

I'm staying on-site to monitor. Please call me directly at 312-555-0300.

David Kim
CEO, TechStart Solutions
Suite 1500, Metro Office Tower`,

  // Medium priority - HVAC comfort issue
  hvacComfort: `From: jwalsh@fitlifegym.com
To: maintenance@willowcreek-mgmt.com
Subject: AC not working properly - getting complaints

Hello,

Jennifer Walsh here from FitLife Gym at Suite 105, Willow Creek Shopping Center.

Our air conditioning doesn't seem to be working correctly. The gym floor area is getting very warm, and we're starting to get member complaints. The thermostat shows 78 degrees but it's set to 68.

This has been going on for about two days now. The gym is 24/7 so access is never an issue, but please try to schedule the technician during off-peak hours if possible - before 6am or after 9pm would be ideal.

It's not an emergency but our members are uncomfortable, especially during peak workout times.

Thanks,
Jennifer Walsh
General Manager
FitLife Gym
(217) 555-0105`,

  // Low priority - parking lot light out
  lightOut: `From: security@gatewayindustrial.com
To: property.manager@gatewayindustrial.com
Subject: Parking lot light out in Bay 4 area

Hi Property Management,

During our nightly rounds, security noticed that one of the parking lot lights near Bay 4 at Gateway Industrial Park is out. It's the third light from the loading dock entrance.

Not urgent, but wanted to report it since it does make that corner of the lot a bit dark. GlobalLog mentioned they'd prefer it fixed before winter when it gets dark earlier.

Can this be added to the maintenance queue?

Thanks,
Gateway Security Team`,

  // Emergency - gas smell at restaurant
  gasLeak: `From: operations@cdfrestaurantgroup.com
To: emergency@willowcreek-mgmt.com
Subject: EMERGENCY - Gas smell at restaurant Suite 210

IMMEDIATE ATTENTION REQUIRED

We have detected a strong gas smell at our restaurant location in Suite 210, Willow Creek Shopping Center.

Actions taken:
- Evacuated all staff and customers
- Shut off gas valve at meter
- Called 911 - fire department is en route
- Cleared the immediate area outside the suite

Please send emergency maintenance and notify adjacent tenants. Gas company has also been contacted.

Contact: Tom Richards, Operations Manager
Phone: 555-0210 (calling from parking lot)

THIS IS AN EMERGENCY`,

  // Plumbing - clogged drain in office
  plumbingClog: `From: admin@lawofficesofsmith.com
To: building.services@metrotower.com
Subject: Clogged sink in break room

Hi Building Services,

We have a clogged sink in our break room at Suite 1500, Metro Office Tower (15th floor).

The sink is draining very slowly and starting to smell. It's been like this for a couple days. We've tried plunging but no luck.

Not an emergency but would appreciate if someone could take a look when convenient. We're in the office M-F, 8am-6pm.

Thank you,
Susan Anderson
Office Administrator
Law Offices of Smith & Partners`,
};

// Helper to get a random sample email
export function getRandomSampleEmail(): string {
  const keys = Object.keys(SAMPLE_EMAILS) as (keyof typeof SAMPLE_EMAILS)[];
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return SAMPLE_EMAILS[randomKey];
}

// Export individual emails for specific test cases
export const {
  roofLeak,
  electricalEmergency,
  hvacComfort,
  lightOut,
  gasLeak,
  plumbingClog,
} = SAMPLE_EMAILS;
