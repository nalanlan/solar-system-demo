import heroBackground from '@/assets/solar/solar-hero-background.png'
import mercuryImage from '@/assets/solar/mercury.jpg'
import venusImage from '@/assets/solar/venus.png'
import earthImage from '@/assets/solar/earth.png'
import marsImage from '@/assets/solar/mars.jpg'
import jupiterImage from '@/assets/solar/jupiter.png'
import saturnImage from '@/assets/solar/saturn.jpg'
import uranusImage from '@/assets/solar/uranus.jpg'
import neptuneImage from '@/assets/solar/neptune.png'

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

export interface Planet {
  id: PlanetId
  name: string
  englishName: string
  tagline: string
  label: string
  category: string
  color: string
  image: string
  distance: string
  orbit: string
  rotation: string
  diameter: string
  temperature: string
  moons: string
  rings: string
  overview: string
  surface: string
  exploration: string
  funFact: string
}

export const solarAssets = {
  heroBackground
}

export const planets: Planet[] = [
  {
    id: 'mercury',
    name: '水星',
    englishName: 'Mercury',
    tagline: '离太阳最近的小型岩石世界，昼夜温差极端。',
    label: '最近太阳',
    category: '类地行星',
    color: '#a8b3c7',
    image: mercuryImage,
    distance: '约 5790 万 km',
    orbit: '约 88 天',
    rotation: '约 58.6 天',
    diameter: '约 4879 km',
    temperature: '约 -180 至 430°C',
    moons: '0',
    rings: '无',
    overview: '水星是八大行星中离太阳最近的一颗。它几乎没有大气保护，白天被太阳炙烤，夜晚又迅速冷却。',
    surface: '水星表面布满撞击坑，看起来有些像月球。因为大气极其稀薄，陨石留下的痕迹能保存很久。',
    exploration: '水手 10 号和信使号都探测过水星，欧洲和日本合作的 BepiColombo 任务正在继续靠近它。',
    funFact: '水星离太阳最近，但不是最热的行星；最热的是被浓厚大气包裹的金星。'
  },
  {
    id: 'venus',
    name: '金星',
    englishName: 'Venus',
    tagline: '被浓厚大气包裹的高温行星，像一座失控温室。',
    label: '最热行星',
    category: '类地行星',
    color: '#f2b35b',
    image: venusImage,
    distance: '约 1.082 亿 km',
    orbit: '约 225 天',
    rotation: '约 243 天',
    diameter: '约 12104 km',
    temperature: '约 465°C',
    moons: '0',
    rings: '无',
    overview: '金星大小与地球接近，但环境完全不同。厚重的二氧化碳大气让它成为太阳系最热的行星。',
    surface: '金星表面压力很高，云层中含有硫酸成分。它的地表被火山地貌和广阔平原覆盖。',
    exploration: '苏联金星号探测器曾成功着陆并传回数据，现代任务也在重新关注这颗“地球的邻居”。',
    funFact: '金星自转方向与多数行星相反，在金星上看太阳会从西边升起。'
  },
  {
    id: 'earth',
    name: '地球',
    englishName: 'Earth',
    tagline: '目前已知唯一拥有生命的蓝色家园。',
    label: '生命家园',
    category: '类地行星',
    color: '#3fc7ff',
    image: earthImage,
    distance: '约 1.496 亿 km',
    orbit: '约 365.25 天',
    rotation: '约 23 小时 56 分',
    diameter: '约 12742 km',
    temperature: '约 -89 至 58°C',
    moons: '1',
    rings: '无',
    overview: '地球拥有液态水、稳定大气和合适的温度范围，是目前唯一确认存在生命的行星。',
    surface: '海洋覆盖了地球表面大部分区域，陆地、冰盖、大气和生命共同塑造了独特的蓝色星球。',
    exploration: '人类通过卫星、空间站和深空探测任务不断回望地球，也借此理解气候、海洋和生命系统。',
    funFact: '从太空看地球，最醒目的不是陆地，而是海洋、云层和大气边缘的蓝色光辉。'
  },
  {
    id: 'mars',
    name: '火星',
    englishName: 'Mars',
    tagline: '布满尘埃、峡谷和极冠的红色星球。',
    label: '红色星球',
    category: '类地行星',
    color: '#f06d42',
    image: marsImage,
    distance: '约 2.279 亿 km',
    orbit: '约 687 天',
    rotation: '约 24.6 小时',
    diameter: '约 6779 km',
    temperature: '约 -125 至 20°C',
    moons: '2',
    rings: '无',
    overview: '火星因富含氧化铁的尘埃呈现红色。它是人类深空探索中最重要的目的地之一。',
    surface: '火星拥有太阳系中极高的火山、巨大的峡谷系统，以及两极冰盖。过去可能存在过更活跃的水环境。',
    exploration: '从轨道器到火星车，人类已经多次探测火星。好奇号、毅力号等任务持续寻找古代宜居环境线索。',
    funFact: '火星的一天和地球很接近，大约 24 小时 39 分钟。'
  },
  {
    id: 'jupiter',
    name: '木星',
    englishName: 'Jupiter',
    tagline: '太阳系最大的行星，拥有壮观风暴和强大磁场。',
    label: '最大行星',
    category: '气态巨行星',
    color: '#d7b17b',
    image: jupiterImage,
    distance: '约 7.785 亿 km',
    orbit: '约 11.86 年',
    rotation: '约 9.9 小时',
    diameter: '约 139820 km',
    temperature: '云顶约 -110°C',
    moons: '约 101',
    rings: '有，较暗',
    overview: '木星质量巨大，是太阳系中体积最大的行星。它的大红斑是持续存在很久的巨大风暴系统。',
    surface: '木星没有像地球那样的固体表面，外层主要由氢和氦组成，云带和风暴形成了醒目的条纹。',
    exploration: '伽利略号、朱诺号等任务让我们更了解木星的大气、磁场和内部结构。',
    funFact: '木星自转非常快，一天不到 10 小时，因此外观略微呈扁球形。'
  },
  {
    id: 'saturn',
    name: '土星',
    englishName: 'Saturn',
    tagline: '以明亮星环闻名的气态巨行星。',
    label: '光环之王',
    category: '气态巨行星',
    color: '#f3d08c',
    image: saturnImage,
    distance: '约 14.3 亿 km',
    orbit: '约 29.45 年',
    rotation: '约 10.7 小时',
    diameter: '约 116460 km',
    temperature: '云顶约 -140°C',
    moons: '约 274',
    rings: '有，非常明显',
    overview: '土星最著名的特征是宽阔明亮的光环。它也是一颗主要由氢和氦组成的气态巨行星。',
    surface: '土星没有坚硬表面，光环主要由冰粒、岩石碎屑和尘埃组成，分布成复杂的环带结构。',
    exploration: '卡西尼号长期环绕土星运行，深入研究了土星、光环以及土卫六和土卫二等卫星。',
    funFact: '土星平均密度低于水。如果有足够大的海洋，它理论上会“浮”起来。'
  },
  {
    id: 'uranus',
    name: '天王星',
    englishName: 'Uranus',
    tagline: '几乎“躺着”自转的青蓝色冰巨星。',
    label: '冰巨星',
    category: '冰巨星',
    color: '#7ee2ea',
    image: uranusImage,
    distance: '约 28.7 亿 km',
    orbit: '约 84 年',
    rotation: '约 17.2 小时',
    diameter: '约 50724 km',
    temperature: '约 -195°C',
    moons: '约 28',
    rings: '有',
    overview: '天王星是一颗遥远的冰巨星，自转轴倾斜极大，看起来像是侧躺着绕太阳运行。',
    surface: '它的大气中含有甲烷，使它呈现蓝绿色。内部可能包含水、氨和甲烷等“冰”成分。',
    exploration: '旅行者 2 号是目前唯一近距离飞掠天王星的探测器，未来仍需要专门任务深入研究。',
    funFact: '天王星的季节非常漫长，一个极区可能连续多年面向太阳。'
  },
  {
    id: 'neptune',
    name: '海王星',
    englishName: 'Neptune',
    tagline: '遥远、寒冷、风速惊人的深蓝色世界。',
    label: '远方蓝星',
    category: '冰巨星',
    color: '#3d68ff',
    image: neptuneImage,
    distance: '约 45.0 亿 km',
    orbit: '约 164.8 年',
    rotation: '约 16.1 小时',
    diameter: '约 49244 km',
    temperature: '约 -200°C',
    moons: '约 16',
    rings: '有',
    overview: '海王星是八大行星中距离太阳最远的一颗。它呈现深蓝色，并拥有强烈的大气活动。',
    surface: '海王星同样没有固体表面。甲烷吸收红光，让它呈现蓝色，强风和风暴在大气中不断变化。',
    exploration: '旅行者 2 号曾在 1989 年飞掠海王星，带回了大量关于这颗遥远行星的珍贵资料。',
    funFact: '海王星的一年约等于地球 165 年，人类发现它以后才刚刚“看完”它绕太阳一圈多一点。'
  }
]

export const featuredMetrics = [
  { label: '日地距离', value: '约 1.496 亿 km' },
  { label: '太阳光度', value: '3.828 x 10^26 W' },
  { label: '太阳系年龄', value: '约 46 亿年' },
  { label: '主要行星', value: '8 颗' }
]

export const planetById = (id: string) => planets.find(planet => planet.id === id) || planets[2]
