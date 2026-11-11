import {
  Cloud, DatabaseBackup, Headset, Rocket, Search, Server, ShieldCheck, Wrench, Layers, ClipboardList, Target, Share2, MessageCircle,
  BarChart3, LayoutTemplate, Code, ShoppingCart, AppWindow, Camera, Video, Film, Palette, Globe, Mail, Lock, CreditCard, RefreshCw, Eye, PenTool, Users, LifeBuoy,
} from 'lucide-react';

/**
 * Detailed text shown on the Contact page when someone arrives from "Enquire about this" on a DIGITAL service
 * (/contact?service=<slug>). It sits between the service's pictures/video at the top and the enquiry form at the bottom.
 * The key is the service's web address name (see slugOf in services.js). Services without an entry here show no extra text.
 *
 * Each entry:  offers  [icon, title, small tag, text]   (the "what we do" cards)
 *              why     [icon, title, text]              (three reasons)
 *              steps   [icon, title, text]              (how we work, four steps)
 *              faq     [question, answer]               (common questions)
 *              offersEyebrow / offersHeading / whyHeading / stepsHeading : the section headings
 */
const WHY_EYEBROW = 'Why AD ZONEX';
const STEPS_EYEBROW = 'How we work';

export const SERVICE_DETAILS = {
  'aws-cloud-services': {
    offersEyebrow: 'What we set up', offersHeading: 'Everything your website needs to run in the cloud',
    offers: [
      [Cloud, 'Website hosting', 'S3 & CloudFront', 'Your website is stored on Amazon S3 and delivered through CloudFront, so pages open quickly for visitors and your site stays online.'],
      [Server, 'Serverless backends', 'Lambda', 'Contact forms, logins, payments and business logic run as small functions that start only when needed, so you pay for what you use.'],
      [Rocket, 'Cloud setup & migration', 'Move with confidence', 'We set up your AWS account properly and move your existing website, files or app from old hosting with as little downtime as possible.'],
      [DatabaseBackup, 'Backup & monitoring', 'Always watched', 'Regular backups, plus checks on uptime and errors, so problems are caught and fixed early.'],
    ],
    whyEyebrow: WHY_EYEBROW, whyHeading: 'A technical team that is part of your brand team',
    why: [
      [Layers, 'One team for everything', 'The people who design your logo and website also set up the cloud it runs on, so nothing is lost between suppliers.'],
      [ShieldCheck, 'Secure from day one', 'HTTPS, careful access settings and backups are part of every setup, not an extra.'],
      [Headset, 'One point of contact', 'You talk to us, not to a support queue. We look after the setup after launch.'],
    ],
    stepsEyebrow: STEPS_EYEBROW, stepsHeading: 'From first call to a site that looks after itself',
    steps: [
      [Search, 'Understand', 'We learn what your website or app does and who uses it.'],
      [ClipboardList, 'Plan', 'We choose the right AWS setup for your traffic and budget, and send a clear written quote.'],
      [Wrench, 'Build and move', 'We set everything up and move your site, files or app across.'],
      [Headset, 'Look after', 'We monitor it, keep backups and fix issues, so you can focus on your business.'],
    ],
    faq: [
      ['Is AWS right for a small business?', 'Often, yes. A simple website on S3 and CloudFront costs very little to run and loads fast. We will tell you honestly if a simpler option suits you better.'],
      ['Can you move my existing website?', 'Yes. We copy your site and files to AWS, test everything, and switch over with as little downtime as possible.'],
      ['Who looks after it after launch?', 'We do. Monitoring, backups and fixes are handled by the same team that built it. Just call or message us if something needs attention.'],
      ['Do I need to know anything about AWS?', 'No. We explain things in plain language and handle the technical work for you.'],
    ],
  },

  'digital-marketing': {
    offersEyebrow: 'What we do', offersHeading: 'Four ways to get your business found and followed',
    offers: [
      [Search, 'Search Engine Optimisation', 'Be found on Google', 'We improve your website pages, keywords and Google Business profile, so people near you find you when they search for what you sell.'],
      [Target, 'Search Engine Marketing', 'Google ads', 'Ads that show when people search for your service, with a clear budget that you agree first, so you pay when someone clicks.'],
      [Share2, 'Social Media Marketing', 'Instagram & Facebook', 'Regular posts, offers and short videos in your brand\'s look, plus paid campaigns that reach people in your area.'],
      [MessageCircle, 'WhatsApp Marketing', 'Straight to the phone', 'Offers and updates sent to customers who have agreed to receive them, with their replies handled in one place.'],
    ],
    whyEyebrow: WHY_EYEBROW, whyHeading: 'Marketing that looks like your brand',
    why: [
      [Layers, 'Design and marketing together', 'Your posts, ads and banners are made by our own design team, so every message looks like you.'],
      [BarChart3, 'Simple, honest reports', 'You see what was spent and what came back, such as calls, messages and visits, in plain language.'],
      [Headset, 'One point of contact', 'You talk to the same person on our team, not to a support queue.'],
    ],
    stepsEyebrow: STEPS_EYEBROW, stepsHeading: 'From first chat to enquiries you can count',
    steps: [
      [Search, 'Understand', 'We learn about your business, your customers and the area you serve.'],
      [ClipboardList, 'Plan', 'We choose the right mix of search, social and WhatsApp for your budget, and send a clear written quote.'],
      [Rocket, 'Launch', 'After your approval we set up and start the campaigns.'],
      [BarChart3, 'Report and improve', 'We share what is working and adjust the rest, so your budget goes where it helps most.'],
    ],
    faq: [
      ['How soon will I see results?', 'Ads and WhatsApp campaigns can bring enquiries quickly. Search optimisation builds up over time. We will tell you honestly what to expect for your business.'],
      ['Is the ad budget included in your fee?', 'No. The ad budget goes directly to Google or Meta. Our fee for planning and managing the campaign is separate, and we quote both clearly before we start.'],
      ['Can you design the posts and banners too?', 'Yes. Our design team makes the posts, banners and short videos, so everything matches your logo and colours.'],
      ['Will you message people who did not ask for it?', 'No. WhatsApp marketing is sent only to customers who have agreed to receive messages from you.'],
    ],
  },

  'web-design-development': {
    offersEyebrow: 'What we build', offersHeading: 'From a simple business site to a full online store',
    offers: [
      [LayoutTemplate, 'Website design', 'Looks right everywhere', 'A clean design in your brand colours that works well on phones, tablets and computers.'],
      [Code, 'Web development', 'Fast and reliable', 'Pages that load quickly, forms that reach you, and a site that is built to be kept up to date.'],
      [ShoppingCart, 'E-commerce', 'Sell online', 'An online shop with product pages, a cart and online payment, so customers can order at any time.'],
      [AppWindow, 'Web applications', 'Tools for your business', 'Booking, billing, customer or staff tools built around the way your business works.'],
    ],
    whyEyebrow: WHY_EYEBROW, whyHeading: 'Design and code from the same team',
    why: [
      [Layers, 'Design and development under one roof', 'The people who design your logo and brochures also design your website, so it matches the rest of your brand.'],
      [ShieldCheck, 'Secure and search-friendly', 'HTTPS, safe forms and a clean page structure are part of the build, so visitors can trust the site and Google can read it.'],
      [Headset, 'We stay after launch', 'Hosting, updates and fixes are handled by the same team that built your site.'],
    ],
    stepsEyebrow: STEPS_EYEBROW, stepsHeading: 'From first idea to a site that is live',
    steps: [
      [Search, 'Understand', 'We learn what your business does, who your customers are and what the site must achieve.'],
      [PenTool, 'Design', 'We show you the look and layout, and refine it with you before building.'],
      [Code, 'Build and test', 'We build the site, connect forms and payments, and test it on phones and computers.'],
      [Rocket, 'Launch and support', 'We take it live, show you how to use it, and stay available for changes.'],
    ],
    faq: [
      ['How long will my website take?', 'A simple business site is usually quicker than an online shop or a web application. After we understand what you need, we give you a clear timeline in the quote.'],
      ['Can I change the text and pictures myself?', 'Yes, if you want that. We can build the site so you can update it yourself, and we are here when you would rather we do it.'],
      ['Will it work on mobile phones?', 'Yes. Every site is designed for phones as well as computers, and tested on both.'],
      ['Can you also look after the domain and hosting?', 'Yes. Our Tech Support service can register your domain, host the site, set up email and keep everything running.'],
    ],
  },

  branding: {
    offersEyebrow: 'What we create', offersHeading: 'Photos, videos and pages that carry your brand',
    offers: [
      [Camera, 'Product photo & video editing', 'Show it at its best', 'Clean product photos and short videos, edited in your brand\'s look and ready for your website, catalogue and social media.'],
      [Video, 'Corporate video shoot', 'Tell your story', 'A shot and edited video about your business, your team or your work, for your website, events and social pages.'],
      [Share2, 'Social media platform handling', 'We run the pages', 'Planning, posting and replying on your pages, so they stay active and on-brand without taking up your time.'],
      [Film, 'Editing and finishing', 'Ready to post', 'Cuts, colour, text and music added, and exported in the right size for each platform.'],
    ],
    whyEyebrow: WHY_EYEBROW, whyHeading: 'One team from the camera to the post',
    why: [
      [Layers, 'One team, start to finish', 'Shooting, editing, design and posting are handled together, so nothing is lost between suppliers.'],
      [Palette, 'Always on-brand', 'Your logo, colours and fonts are used the same way on every photo, video and post.'],
      [Headset, 'Simple to work with', 'You tell us what you need once. We plan it, do it and keep you updated.'],
    ],
    stepsEyebrow: STEPS_EYEBROW, stepsHeading: 'From the first idea to content that is live',
    steps: [
      [Search, 'Understand', 'We learn about your product or business, and what the content should achieve.'],
      [ClipboardList, 'Plan', 'We plan what to shoot or post, and send a clear written quote.'],
      [Camera, 'Shoot and edit', 'We shoot at your place or ours, and edit everything in your brand\'s look.'],
      [Rocket, 'Publish and manage', 'We post and manage your pages, or hand you the finished files.'],
    ],
    faq: [
      ['Can you shoot at my shop or office?', 'Yes. We can shoot where your business is. We agree the date and what to capture beforehand.'],
      ['Can you manage my social media pages?', 'Yes. We plan, post and reply on your pages. We agree exactly what is included in the quote.'],
      ['Will you use my logo and colours?', 'Always. If you do not have a logo yet, our design team can create one first.'],
      ['What will I receive at the end?', 'Edited photos and videos in the right sizes for your website and social pages. We agree the exact list in the quote.'],
    ],
  },

  'tech-support': {
    offersEyebrow: 'What we look after', offersHeading: 'The behind-the-scenes work that keeps your business online',
    offers: [
      [Globe, 'Domain & hosting', 'Your address online', 'We register your domain and host your website, and handle renewals so nothing expires by mistake.'],
      [Mail, 'Email solution', 'you@yourbusiness', 'Business email addresses on your own domain, set up on your phone and computer.'],
      [Lock, 'SSL certification', 'The padlock customers look for', 'HTTPS for your website, so visitors see it is secure and their details are protected.'],
      [CreditCard, 'Payment integration', 'Get paid online', 'We connect a payment gateway to your website, test it, and explain how the money reaches your bank account.'],
      [RefreshCw, 'Website AMC', 'A yearly care plan', 'Regular updates, backups and checks, with fixes when something needs attention.'],
      [Server, 'Server support', 'When something stops', 'Help with servers and hosting problems, so your website and tools get back up quickly.'],
    ],
    whyEyebrow: WHY_EYEBROW, whyHeading: 'One team that keeps everything running',
    why: [
      [Eye, 'Problems caught early', 'We keep an eye on your website and tools, so issues are fixed before customers notice.'],
      [LifeBuoy, 'A real person to call', 'You talk to us, not to a support queue.'],
      [Layers, 'Everything in one place', 'Domain, hosting, email, security and payments are looked after by one team, so nothing falls between suppliers.'],
    ],
    stepsEyebrow: STEPS_EYEBROW, stepsHeading: 'From a quick check to ongoing care',
    steps: [
      [Search, 'Check', 'We look at what you have today: domain, hosting, email and website.'],
      [ClipboardList, 'Plan', 'We tell you what needs attention, and send a clear written quote.'],
      [Wrench, 'Set up and fix', 'We set up or repair what is needed and test that it all works.'],
      [Headset, 'Look after', 'We stay available, with a yearly care plan if you want one.'],
    ],
    faq: [
      ['Can you take over my existing hosting or website?', 'Yes. We review what you have, move or manage it, and tell you honestly if anything needs to change.'],
      ['What is a Website AMC?', 'AMC means Annual Maintenance Contract. It is a yearly plan where we keep your website updated, backed up and working, and fix problems when they appear.'],
      ['Will my domain be in my name?', 'It should always be, and we set it up that way. Your domain belongs to your business.'],
      ['Can you set up online payments?', 'Yes. We connect a payment gateway to your website, test it, and show you how payments reach your account.'],
    ],
  },
};
