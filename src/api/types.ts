export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: ApiUser;
}

export interface ApiModule {
  _id: string;
  name: string;
  description?: string;
  parentId?: string | ApiModule;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRolePermission {
  module: ApiModule | string;
  actions: string[];
}

export interface ApiRole {
  _id: string;
  roleName: string;
  permissions: ApiRolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiUser {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  role: ApiRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiVesselType {
  _id: string;
  group: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSurveyType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiAreaOfOperation {
  _id: string;
  AreaCategory: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiRequestDocument {
  _id: string;
  name: string;
  key: string;
  url?: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface ApiRequest {
  _id: string;
  requestNumber: string;
  uqmsNumber?: string;
  imoNumber?: string;
  vesselName: string;
  companyName: string;
  contactPersonName: string;
  contactPersonNumber: string;
  registerdAddress?: string;
  invoicingAddress: string;
  companyEmail: string;
  sector: 'marine' | 'industrial';
  vesselType: ApiVesselType | string;
  areaOfOperation: ApiAreaOfOperation | string;
  surveyTypes: Array<ApiSurveyType | string>;
  documents?: ApiRequestDocument[];
  status: 'active' | 'print' | 'reject' | 'success';
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiVessel {
  _id: string;
  uqmsNumber?: string;
  imoNumber?: string;
  vesselName: string;
  vesselType?: ApiVesselType | string;
  areaOfOperation?: ApiAreaOfOperation | string;
  description?: string;
  callSign?: string;
  flag?: string;
  portOfRegistry?: string;
  dateOfRegistry?: string;
  classNotationHull?: string;
  classNotationMachinery?: string;
  grossTonnage?: number;
  netTonnage?: number;
  deadweight?: number;
  lightship?: number;
  overallLength?: number;
  lbp?: number;
  length?: number;
  breadth?: number;
  draught?: number;
  ballastWtrCapacity?: number;
  material?: string;
  builder?: string;
  placeOfBuilt?: string;
  yardNo?: string;
  dateOfBuild?: string;
  keelDate?: string;
  buildingContractDate?: string;
  majorConversionDate?: string;
  depth?: number;
  freeboard?: number;
  equipmentLtr?: string;
  chainQualityType?: string;
  mainEngineModel?: string;
  noOfEngines?: number;
  totalPower?: number;
  stroke?: string;
  engineBuilder?: string;
  engineBuilt?: string;
  propeller?: string;
  speed?: number;
  rpm?: number;
  electricalInstallation?: string;
  boilers?: string;
  sisterShips?: Array<ApiVessel | string>;
  registeredOwnerName?: string;
  registeredOwnerAddress?: string;
  invoicingName?: string;
  invoicingAddress?: string;
  managerName?: string;
  managerAddress?: string;
  companyId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiScheduleIIDocument {
  _id?: string;
  name: string;
  key: string;
  url?: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface ApiScheduleII {
  _id: string;
  firstEntry: string;
  documents: ApiScheduleIIDocument[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiFirstEntry {
  _id: string;
  request: ApiRequest | string;
  vessel: ApiVessel | string;
  isQuoted: boolean;
  quotationNumber?: string;
  quotationComments?: string;
  scheduleII?: ApiScheduleII | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSurveyorAssignment {
  surveyorId?: ApiUser | string;
  currency?: string;
  specialAttendanceFees?: number;
}

export interface ApiVisitDetail {
  visitNo?: string;
  visitDate: string;
  startSurvey?: string;
  endSurvey?: string;
  location?: string;
  status?: string;
  isLastVist?: boolean;
  isLastVisitDate?: boolean;
  surveyorAssignments: ApiSurveyorAssignment[];
}

export interface ApiFirstEntrySurveyBooking {
  _id: string;
  vesselId?: ApiVessel | string;
  requestIds?: Array<ApiRequest | string>;
  shipName: string;
  requestedBy?: string;
  portOfSurvey?: string;
  reportNo?: string;
  portOfRegistry?: string;
  flag?: string;
  shipType?: string;
  shipBuilder?: string;
  engineBuilder?: string;
  duallyClassWith?: string;
  dwt?: number;
  keelDate?: string;
  uqmsNo?: string;
  requestedDate: string;
  surveyMode: string;
  society?: string;
  managedBy?: string;
  buildDate?: string;
  yardNo?: string;
  officialNo?: string;
  gt?: number;
  callSign?: string;
  lastVisitDate?: string;
  lastVisit?: string;
  visitDetails: ApiVisitDetail[];
  surveysRequested: string[];
  status: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSurveyReportCategory {
  _id?: string;
  surveyCategory: string;
  surveyStatus?: string;
  isPostponed?: boolean;
  postponeDate?: string;
  surveyDate?: string;
  assignedDate?: string;
  dueFrom?: string;
  dueTo?: string;
  remarks?: string;
}

export interface ApiFirstEntrySurveyReport {
  _id: string;
  bookingId: ApiFirstEntrySurveyBooking | string;
  vesselId?: ApiVessel | string;
  shipName: string;
  managedBy?: string;
  uqmsNo?: string;
  surveyRequestedDate?: string;
  firstSurveyDate?: string;
  reportNo: string;
  portOfSurvey?: string;
  lastSurveyDate?: string;
  reportRemarks?: string;
  anniversaryDate?: string;
  surveys: ApiSurveyReportCategory[];
  status?: string;
  createdBy?: ApiUser | string;
  updatedBy?: ApiUser | string;
  createdAt?: string;
  updatedAt?: string;
}

