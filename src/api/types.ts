export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
}

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
  order?: number;
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
  fullName: string;
  nameWithInitials?: string;
  phoneNumber: string;
  address?: string;
  dob?: string;
  empNumber?: string;
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
  rfsDocNo?: string;
  vesselCode?: string;
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
  vesselCode?: string;
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
  emailSent?: boolean;
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

export interface ApiChecklistQuestion {
  _id?: string;
  id?: string;
  item: string;
  description?: string | null;
  additionalFields?: string[];
  surveyCategories: Array<ApiSurveyType | string>;
  areaOfOperations: Array<ApiAreaOfOperation | string>;
  boatTypes: Array<ApiVesselType | string>;
  vesselCode?: string | null;
  qCategory?: string | null;
  createdBy?: ApiUser | string;
  updatedBy?: ApiUser | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiChecklistItemFile {
  _id?: string;
  filename: string;
  key: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

export interface ApiChecklistItem {
  _id?: string;
  checklistQuestionId: ApiChecklistQuestion | string;
  isChecked?: boolean;
  comment?: 'Satisfactory' | 'Unsatisfactory' | 'N/A' | '';
  visitNumber?: string;
  surveyNames?: string[];
  surveyDate?: string;
  updatedDate?: string;
  remarks?: string;
  additionalFields?: { name: string; value: string }[];
  files?: ApiChecklistItemFile[];
  surveyorId?: string;
  surveyorName?: string;
}

export interface ApiRemarkComment {
  _id: string;
  text: string;
  createdBy: ApiUser | string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiGeneralRemark {
  _id: string;
  text: string;
  isClosed: boolean;
  createdBy: ApiUser | string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  comments: ApiRemarkComment[];
}

export interface ApiFirstEntryFullReport {
  _id: string;
  firstEntrySurveyReportId: ApiFirstEntrySurveyReport | string;
  bookingId: ApiFirstEntrySurveyBooking | string;
  vesselId: ApiVessel | string;
  uqmsNo?: string;
  checklist: ApiChecklistItem[];
  remarks?: ApiGeneralRemark[];
  dailyReportPdfKey?: string;
  dailyReportPdfUrl?: string;
  dailyReportPdfBucket?: string;
  dailyReportPdfFilename?: string;
  dailyReportPdfSize?: number;
  dailyReportPdfEtag?: string;
  dailyReportPdfGeneratedAt?: string;
  createdBy?: ApiUser | string;
  updatedBy?: ApiUser | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiVesselCode {
  _id: string;
  code: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSurveyFindingItem {
  category: string;
  status: 'Satisfactory' | 'Not Satisfactory' | 'N/A';
}

export interface ApiSCCCOS {
  _id: string;
  certificateNumber: string;
  vesselId: ApiVessel | string;
  surveyReportId: ApiFirstEntrySurveyReport | string;
  surveyBookingId: ApiFirstEntrySurveyBooking | string;
  surveyFindings: ApiSurveyFindingItem[];
  typeOfSurvey?: string;
  nominatedDeparturePoint?: string;
  dateOfIssue: string;
  issuedBy: ApiUser | string;
  createdBy?: ApiUser | string;
  updatedBy?: ApiUser | string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNoteItem {
  _id?: string;
  noteCategory: 'Additional Information' | 'Statutory Conditions' | string;
  noteCode: string;
  description: string;
  type: 'Hull' | 'Machinery' | 'Equipment';
  status: 'new' | 'modified' | 'deleted' | 'retained';
  dueDate?: string;
}

export interface ApiNote {
  _id?: string;
  vesselId: string;
  notes: ApiNoteItem[];
  createdBy?: ApiUser | string;
  updatedBy?: ApiUser | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiRecEquipQues {
  _id: string;
  codeRefNo: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiVesselEquipmentRecordItem {
  _id?: string;
  questionId: ApiRecEquipQues;
  status: 'Provided' | 'Not Provided' | 'Not Applicable';
  remarks?: string;
}

export interface ApiVesselEquipmentRecord {
  _id?: string;
  vesselId: ApiVessel | string;
  surveyReportId: ApiFirstEntrySurveyReport | string;
  equipmentRecords: ApiVesselEquipmentRecordItem[];
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSurveyReport {
  _id?: string;
  vesselId: ApiVessel | string;
  firstEntrySurveyReportId: ApiFirstEntrySurveyReport | string;
  vesselEquipmentRecordId: ApiVesselEquipmentRecord | string;
  stabilityBooklet: {
    available: boolean;
    approvedBy: string;
    approvalDate?: string | null;
  };
  dockingSurvey: {
    harbour: string;
    date?: string | null;
  };
  thicknessMeasurement: {
    carriedBy: string;
    harbour: string;
    date?: string | null;
    reportNo: string;
  };
  tanks: {
    fuelOilPortFrame: string;
    fuelOilStarboardFrame: string;
    freshWaterCenterFrame: string;
  };
  toiletCount: number;
  hasGalley: boolean;
  galleyRemarks?: string;
  machinery: {
    mainEngineFuelType: string;
    auxEngineCount: number;
    auxEngineModel: string;
    auxEngineOutput: string;
    powerGeneration: string;
  };
  signature: {
    dateOfIssue?: string | null;
    surveyorName: string;
    surveyorTitle: string;
    certifyingBody: string;
  };
  status: 'Draft' | 'Approved';
  createdBy?: ApiUser | string;
  updatedBy?: ApiUser | string;
  createdAt?: string;
  updatedAt?: string;
}



