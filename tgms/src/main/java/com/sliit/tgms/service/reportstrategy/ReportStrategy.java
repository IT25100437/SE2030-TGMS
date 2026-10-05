package com.sliit.tgms.service.reportstrategy;

import java.util.List;
import java.util.Map;

public interface ReportStrategy {
    String getType();
    List<Map<String, Object>> generate();
}
